import React, { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Users,
  Banknote,
  Edit2,
  Clock,
  X,
  Sparkles,
  Bell,
  BellRing,
  MessageSquareText,
  ImagePlus,
  Eye,
  Send,
  ClipboardPaste,
  Settings,
  Download,
  ArrowUpDown,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import { CustomInput } from "../components/Common";
import { formatDateTime, formatNumber, toEnglishDigits } from "../utils/format";
import { Keypad } from "../components/Keypad";
import {
  calculateLedgerBreakdown,
  getLedgerRecordStatus,
  summarizeLedgerRecords,
} from "../utils/finance";
import { prepareReceiptImage } from "../utils/image";
import { isFirebaseConfigured } from "../firebase";
import { submitPartnerReceipt } from "../services/receiptService";
import {
  sendEditRequestDirectlyToTelegram,
  sendReceiptDirectlyToTelegram,
} from "../utils/telegramDirect";
import {
  clearPartnerMessageFromServer,
  fetchPartnerMessageFromServer,
  queueReceiptForAdmin,
  submitPartnerReplyToServer,
  subscribePartnerEvents,
} from "../utils/adminSync";
import { setInstallProfile } from "../utils/installProfile";
import {
  getInstallInstructions,
  isStandaloneDisplayMode,
} from "../utils/installSupport";
import { getPartnerLabels } from "../utils/partnerProfile";
import { captureNodeAsPng } from "../utils/capture";
import {
  appendCalculatorDigit,
  applyCalculatorOperator,
  resolveCalculatorValue,
} from "../utils/calculator";
import {
  getReceiptStatusLabel,
  getTelegramStatusLabel,
  getTelegramStatusTone,
} from "../utils/receiptStatus";
import { pickBlessingMessage } from "../utils/blessings";
import { buildPartnerManifest, buildPartnerRoute } from "../utils/manifest";

const PARTNER_MESSAGE_SYNC_POLL_MS = 2500;
const PARTNER_MESSAGE_SEEN_PREFIX = "financial_partner_seen_message_";

function getStatusBorderClass(status, isDarkMode) {
  if (isDarkMode) {
    return (
      {
        pending: "border-amber-500/30 shadow-amber-500/5",
        approved: "border-emerald-500/30 shadow-emerald-500/5",
        rejected: "border-rose-500/30 shadow-rose-500/5",
        frozen: "border-slate-500/30 shadow-slate-500/5",
        review: "border-indigo-500/30 shadow-indigo-500/5",
      }[status] || "border-white/5"
    );
  }
  return (
    {
      pending: "border-amber-200 bg-amber-50/30",
      approved: "border-emerald-200 bg-emerald-50/30",
      rejected: "border-rose-200 bg-rose-50/30",
      frozen: "border-slate-200 bg-slate-50/30",
      review: "border-indigo-200 bg-indigo-50/30",
    }[status] || "border-slate-100"
  );
}

const SharedRecordView = ({
  partnerId,
  partnerName,
  partnerGender = "male",
  isDarkMode,
  ledgers,
  addLedgerRecord,
  updateLedgerRecord,
  deleteLedgerRecord,
  requestLedgerEdit,
  editRequests,
  globalSettings,
  partnerMessage,
  clearPartnerMessage,
  notificationHistory = [],
  notificationArchive = [],
  registerNotification,
  syncLedgerRecordToServer,
  onOpenNotifications,
  onOpenSettings,
  telegramTopicId,
}) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptImageSource, setReceiptImageSource] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [isPartnerConversationOpen, setIsPartnerConversationOpen] =
    useState(false);
  const [livePartnerMessage, setLivePartnerMessage] = useState(
    partnerMessage || null,
  );
  const [blessingModal, setBlessingModal] = useState(null);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [isExportingStatement, setIsExportingStatement] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isExportingSorted, setIsExportingSorted] = useState(false);
  const [receiptStatusMessage, setReceiptStatusMessage] = useState(null);
  const [editStatusMessage, setEditStatusMessage] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [sortDirection, setSortDirection] = useState("desc");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] =
    useState("incoming");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  const [showKeypad, setShowKeypad] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  const [editModalConfig, setEditModalConfig] = useState(null);
  const [newAmount, setNewAmount] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showEditNoteField, setShowEditNoteField] = useState(false);
  const [showEditKeypad, setShowEditKeypad] = useState(false);
  const [activeCalculatorTarget, setActiveCalculatorTarget] =
    useState("amount");
  const receiptImageInputRef = useRef(null);
  const statementExportRef = useRef(null);

  const partnerLabels = getPartnerLabels(partnerGender);
  const themeColor = globalSettings?.appearance?.themeColor || "#EF233C";

  const pendingRequests = editRequests.filter(
    (req) => req.partnerId === partnerId && req.status === "pending",
  );
  const partyBPct = Number(globalSettings?.financials?.partyBPct) || 0;
  const bankCommRate = Number(globalSettings?.financials?.bankCommRate) || 0;
  const directEditWindowSeconds = 300;
  const adminMessageAlertsEnabled =
    globalSettings?.notifications?.adminMessageAlerts !== false;
  const adminMessageSoundEnabled =
    adminMessageAlertsEnabled &&
    globalSettings?.notifications?.adminMessageSound !== false;

  const effectivePartnerMessage = livePartnerMessage?.text
    ? livePartnerMessage
    : partnerMessage;
  const isResetMode = effectivePartnerMessage?.text === "__RESET__";
  const partnerLedger = isResetMode ? [] : ledgers[partnerId] || [];
  const partnerMessageSeenKey = `${PARTNER_MESSAGE_SEEN_PREFIX}${partnerId}`;
  const unreadNotificationCount = notificationHistory.filter(
    (entry) => entry.unread,
  ).length;
  const totalNotifications = unreadNotificationCount;

  const summary = useMemo(
    () => summarizeLedgerRecords(partnerLedger, globalSettings),
    [partnerLedger, globalSettings],
  );
  const receiptStats = useMemo(
    () => ({
      confirmed: partnerLedger.filter(
        (record) => getLedgerRecordStatus(record) === "approved",
      ).length,
      pending: partnerLedger.filter(
        (record) => getLedgerRecordStatus(record) === "pending",
      ).length,
      frozen: partnerLedger.filter(
        (record) => getLedgerRecordStatus(record) === "frozen",
      ).length,
    }),
    [partnerLedger],
  );

  const isWithinDirectEditWindow = (record) => {
    const createdAt = new Date(record?.date || 0).getTime();
    if (!createdAt) {
      return false;
    }

    return Date.now() - createdAt <= directEditWindowSeconds * 1000;
  };

  const downloadBlobFile = (blob, fileName) => {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  };



  const getReceiptNumber = (record, fallbackNumber = 0) => {
    const explicitNumber = Number(record?.receiptNumber);
    return Number.isFinite(explicitNumber) && explicitNumber > 0
      ? explicitNumber
      : fallbackNumber;
  };
  const sortedPartnerLedger = useMemo(() => {
    const withFallbackNumbers = partnerLedger.map((record, index) => ({
      record,
      fallbackNumber: index + 1,
    }));

    withFallbackNumbers.sort((left, right) => {
      if (isExportingSorted) {
        // Force sort by date Ascending for the "Sorted Statement"
        return (
          new Date(left.record.date || 0).getTime() -
          new Date(right.record.date || 0).getTime()
        );
      }
      const leftNumber = getReceiptNumber(left.record, left.fallbackNumber);
      const rightNumber = getReceiptNumber(right.record, right.fallbackNumber);
      return sortDirection === "asc"
        ? leftNumber - rightNumber
        : rightNumber - leftNumber;
    });

    return withFallbackNumbers;
  }, [partnerLedger, sortDirection, isExportingSorted]);
  const messageThread = useMemo(() => {
    if (
      Array.isArray(effectivePartnerMessage?.thread) &&
      effectivePartnerMessage.thread.length > 0
    ) {
      return effectivePartnerMessage.thread;
    }

    if (effectivePartnerMessage?.text) {
      return [
        {
          id: `legacy-${effectivePartnerMessage.sentAt || Date.now()}`,
          sender:
            effectivePartnerMessage?.sender === "partner" ? "partner" : "admin",
          text: effectivePartnerMessage.text,
          sentAt: effectivePartnerMessage.sentAt,
        },
      ];
    }

    return [];
  }, [effectivePartnerMessage]);

  useEffect(() => {
    const sessionKey = `blessing_shown_${partnerId}`;
    const hasBeenShown = sessionStorage.getItem(sessionKey);

    if (!hasBeenShown) {
      setBlessingModal(pickBlessingMessage(partnerName));
      sessionStorage.setItem(sessionKey, "true");
    }
  }, [partnerId, partnerName]);

  // Auto-close blessing modal after 2 seconds
  useEffect(() => {
    if (blessingModal) {
      const timer = setTimeout(() => {
        setBlessingModal(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [blessingModal]);

  useEffect(() => {
    if (!partnerMessage?.text) return;

    setLivePartnerMessage((current) => {
      const currentSignature = `${current?.sentAt || ""}-${current?.text || ""}`;
      const nextSignature = `${partnerMessage.sentAt || ""}-${partnerMessage.text || ""}`;
      return currentSignature === nextSignature ? current : partnerMessage;
    });
  }, [partnerMessage]);

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return undefined;

    const originalHref = manifestLink.getAttribute("href");
    const manifestBlob = new Blob(
      [
        JSON.stringify(
          buildPartnerManifest({
            partnerId,
            partnerName,
            partnerGender,
            themeColor,
            search: window.location.search,
          }),
        ),
      ],
      { type: "application/manifest+json" },
    );
    const manifestUrl = URL.createObjectURL(manifestBlob);
    manifestLink.setAttribute("href", manifestUrl);

    return () => {
      manifestLink.setAttribute("href", originalHref || "/manifest.json");
      URL.revokeObjectURL(manifestUrl);
    };
  }, [partnerId, partnerName, partnerGender, themeColor]);

  useEffect(() => {
    const previousTitle = document.title;
    const appleTitleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]',
    );
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousAppleTitle = appleTitleMeta?.getAttribute("content");
    const previousThemeColor = themeMeta?.getAttribute("content");
    const nextTitle = `${partnerLabels.installTitle} ${partnerName}`;

    document.title = nextTitle;
    appleTitleMeta?.setAttribute("content", nextTitle);
    themeMeta?.setAttribute("content", themeColor);

    return () => {
      document.title = previousTitle;
      if (appleTitleMeta && previousAppleTitle) {
        appleTitleMeta.setAttribute("content", previousAppleTitle);
      }
      if (themeMeta && previousThemeColor) {
        themeMeta.setAttribute("content", previousThemeColor);
      }
    };
  }, [partnerName, partnerLabels.installTitle, themeColor]);

  useEffect(() => {
    const detectStandalone = () => isStandaloneDisplayMode();

    setIsStandaloneMode(detectStandalone());

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandaloneMode(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribePartnerEvents(partnerId, {
      onMessageUpdated: (payload) => {
        if (!active) return;
        setLivePartnerMessage((current) => {
          const currentSignature = `${current?.sentAt || ""}-${current?.text || ""}`;
          const nextSignature = `${payload?.message?.sentAt || ""}-${payload?.message?.text || ""}`;
          return currentSignature === nextSignature
            ? current
            : payload.message;
        });
      },
      onMessageCleared: () => {
        if (!active) return;
        setLivePartnerMessage(null);
      },
      onLedgerUpdated: (payload) => {
        if (!active) return;
        if (typeof syncLedgerRecordToServer === "function") {
          syncLedgerRecordToServer(payload.record);
        }
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [partnerId, syncLedgerRecordToServer]);

  useEffect(() => {
    if (!effectivePartnerMessage?.text) return;

    if (effectivePartnerMessage?.sender === "partner") {
      return;
    }

    setIsPartnerConversationOpen(true);

    const messageSignature = `${effectivePartnerMessage.sentAt || ""}-${effectivePartnerMessage.text || ""}`;
    const lastSeenSignature = localStorage.getItem(partnerMessageSeenKey);

    if (lastSeenSignature !== messageSignature) {
      localStorage.setItem(partnerMessageSeenKey, messageSignature);

      const displayMsg =
        effectivePartnerMessage.text === "__RESET__"
          ? "تم تصفير سجلاتك بنجاح والبدء من جديد. نتمنى لك التوفيق!"
          : effectivePartnerMessage.text;

      registerNotification?.({
        id: `partner-message-${partnerId}-${effectivePartnerMessage.sentAt || Date.now()}`,
        type: "admin-message",
        title: "رسالة من الإدارة",
        body: displayMsg,
        soundVariant: adminMessageSoundEnabled ? "message" : null,
        showSystem: adminMessageAlertsEnabled,
      });

      if (adminMessageAlertsEnabled) {
        window.appAlert(displayMsg, "رسالة من الإدارة");
      }
    }
  }, [
    partnerId,
    effectivePartnerMessage,
    adminMessageAlertsEnabled,
    adminMessageSoundEnabled,
    partnerMessageSeenKey,
    registerNotification,
  ]);

  const resetReceiptForm = () => {
    setAmount("");
    setNote("");
    setShowNoteField(false);
    setReceiptImage(null);
    setReceiptImageSource("");
  };

  const showTemporaryStatus = (setter, tone, text) => {
    setter({ tone, text });
    window.setTimeout(() => {
      setter((current) => (current?.text === text ? null : current));
    }, 6000);
  };

  const buildReceiptRecord = () => ({
    id: Date.now(),
    syncId: `partner-${partnerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receiptNumber:
      partnerLedger.reduce(
        (maxNumber, record, index) =>
          Math.max(maxNumber, getReceiptNumber(record, index + 1)),
        0,
      ) + 1,
    date: new Date().toISOString(),
    amount: parseFloat(amount),
    note: showNoteField ? toEnglishDigits(note).trim() : "",
    imageDataUrl: receiptImage?.dataUrl || "",
    imageName: receiptImage?.fileName || "",
    imageType: receiptImage?.mimeType || "",
    source: "partner",
    status: globalSettings?.financials?.defaultReceiptStatus || (globalSettings?.financials?.autoApprove ? "approved" : "pending"),
  });

  const applyReceiptImageFile = async (selectedFile, source = "upload") => {
    try {
      const preparedImage = await prepareReceiptImage(selectedFile);
      setReceiptImage(preparedImage);
      setReceiptImageSource(source);
    } catch (error) {
      await window.appAlert(error.message || "تعذر تجهيز صورة الإيصال.");
    }
  };

  const handleReceiptImageChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    await applyReceiptImageFile(selectedFile, "upload");
    event.target.value = "";
  };

  const readClipboardImage = async () => {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      return null;
    }

    try {
      // Explicitly check for permission if API is available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'clipboard-read' });
          if (status.state === 'denied') {
            throw new Error('تم رفض الوصول للحافظة. يرجى تفعيل الإذن من إعدادات المتصفح.');
          }
        } catch (e) {
          // Some browsers don't support querying 'clipboard-read'
        }
      }

      // Ensure window is focused (crucial for mobile)
      if (document.hasFocus && !document.hasFocus()) {
        window.focus();
      }

      const clipboardItems = await navigator.clipboard.read();
      if (!clipboardItems || clipboardItems.length === 0) return null;

      // Log types for debugging on mobile
      console.log('Clipboard items found:', clipboardItems.length);
      
      let imageBlob = null;
      let imageType = null;

      for (const item of clipboardItems) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) {
          imageBlob = await item.getType(type);
          imageType = type;
          break;
        }
      }

      if (!imageBlob) return null;

      const extension = imageType.split("/")[1] || "png";
      return new File([imageBlob], `clipboard-receipt-${Date.now()}.${extension}`, {
        type: imageType,
      });
    } catch (error) {
      console.error("Failed to read clipboard image:", error);
      if (error.name === 'NotAllowedError' || (error.message && error.message.includes('الإذن'))) {
        await window.appAlert('يرجى منح المتصفح إذن الوصول للحافظة عند ظهور الطلب لتتمكن من لصق الصور.');
      }
      return null;
    }
  };

  const handlePasteReceiptImage = async () => {
    // First check if API exists
    if (!navigator.clipboard || !navigator.clipboard.read) {
      await window.appAlert(
        'عذراً، متصفحك لا يدعم خاصية اللصق المباشر للصور برمجياً. يمكنك الضغط مطولاً على الصفحة واختيار "لصق" إذا كانت الصورة منسوخة، أو استخدام زر "اختيار من المعرض".',
      );
      return;
    }

    const clipboardFile = await readClipboardImage();

    if (clipboardFile) {
      await applyReceiptImageFile(clipboardFile, "paste");
      return;
    }

    // Fallback: If programmatic read failed, suggest native paste
    const res = await window.appConfirm(
      'لم نتمكن من الوصول للصور في الحافظة تلقائياً. هل تريد استخدام "وضع اللصق اليدوي"؟ (سيتيح لك الضغط مطولاً واللصق يدوياً)',
      'لصق صورة'
    );
    
    if (res) {
       // We can provide a temporary overlay or just tell them to paste anywhere
       await window.appAlert('الآن يمكنك الضغط مطولاً في أي مكان في الصفحة واختيار "لصق" (Paste) من القائمة التي ستظهر.');
    }
  };

  const handleChooseReceiptImage = () => {
    receiptImageInputRef.current?.click();
  };

  const handleReceiptImagePaste = async (event) => {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find((item) =>
      item.type.startsWith("image/"),
    );

    if (!imageItem) return;

    const selectedFile = imageItem.getAsFile();
    if (!selectedFile) return;

    event.preventDefault();
    await applyReceiptImageFile(selectedFile, "paste");
  };

  useEffect(() => {
    window.addEventListener("paste", handleReceiptImagePaste);
    return () => window.removeEventListener("paste", handleReceiptImagePaste);
  }, []);

  const notifyAdminViaTelegram = async ({ record, action }) => {
    if (action === "edit") {
      const newBreakdown = calculateLedgerBreakdown(
        record.amount,
        globalSettings,
      );
      return sendEditRequestDirectlyToTelegram({
        partnerName,
        partnerGender,
        oldAmount: formatNumber(editModalConfig?.oldAmount || 0),
        newAmount: formatNumber(record.amount),
        newNet: formatNumber(newBreakdown.net),
        note: record.note,
        createdAt: formatDateTime(record.date),
        topicId: telegramTopicId,
      });
    }

    const breakdown = calculateLedgerBreakdown(record.amount, globalSettings);
    const summary = {
      partyBPct,
      bankCommRate,
      discount: formatNumber(breakdown.discount),
      bankComm: formatNumber(breakdown.bankComm),
      net: formatNumber(breakdown.net),
    };

    return sendReceiptDirectlyToTelegram({
      partnerId,
      partnerName,
      partnerGender,
      receiptId: getReceiptNumber(record, (partnerLedger.length || 0) + 1),
      amount: formatNumber(record.amount),
      note: record.note,
      createdAt: formatDateTime(record.date),
      hasImage: Boolean(record.imageDataUrl),
      imageDataUrl: record.imageDataUrl,
      status: record.status,
      summary,
    });
  };

  const handleAddReceipt = async () => {
    if (isResetMode) {
      await clearPartnerMessageFromServer(partnerId).catch(() => {});
      setLivePartnerMessage(null);
    }

    if (!receiptImage?.dataUrl) {
      await window.appAlert("يرجى إضافة صورة الإيصال");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      await window.appAlert("يرجى إدخال مبلغ صحيح");
      return;
    }

    setIsSubmittingReceipt(true);

    if (isFirebaseConfigured) {
      showTemporaryStatus(
        setReceiptStatusMessage,
        "info",
        "جاري إرسال الإيصال...",
      );

      try {
        const result = await submitPartnerReceipt({
          partnerId,
          partnerName,
          amount: parseFloat(amount),
          note: showNoteField ? toEnglishDigits(note).trim() : "",
          receiptImage,
          telegramTopicId,
          status: globalSettings?.financials?.defaultReceiptStatus || (globalSettings?.financials?.autoApprove ? "approved" : "pending"),
        });

        resetReceiptForm();
        showTemporaryStatus(
          setReceiptStatusMessage,
          result.telegramStatus === "failed" ? "warning" : "success",
          result.telegramStatus === "failed"
            ? "تم حفظ الإيصال، لكن فشل إرساله إلى تليجرام"
            : "تمت إضافة الإيصال وإرساله بنجاح عبر تليجرام، وهو بانتظار تأكيد الإدارة",
        );
      } catch (error) {
        showTemporaryStatus(
          setReceiptStatusMessage,
          "warning",
          error.message || "تعذر إرسال الإيصال الآن. حاول مرة أخرى.",
        );
      } finally {
        setIsSubmittingReceipt(false);
      }
      return;
    }

    const record = buildReceiptRecord();
    addLedgerRecord(partnerId, record);
    resetReceiptForm();
    showTemporaryStatus(
      setReceiptStatusMessage,
      "info",
      "تم حفظ الإيصال فوراً. جاري تصديره للإدارة وإرسال ملخصه الكامل...",
    );

    try {
      let queueSucceeded = false;
      let latestError = null;

      try {
        await queueReceiptForAdmin({
          partnerId,
          partnerName,
          record,
        });
        queueSucceeded = true;
      } catch (error) {
        latestError = error;
      }

      let telegramResult = null;

      try {
        telegramResult = await notifyAdminViaTelegram({
          record,
          action: "receipt",
        });
      } catch (error) {
        latestError = latestError || error;
      }

      if (!queueSucceeded && !telegramResult) {
        throw (
          latestError || new Error("تعذر تصدير الإيصال أو إرسال إشعار الإدارة.")
        );
      }

      showTemporaryStatus(
        setReceiptStatusMessage,
        queueSucceeded && telegramResult ? "success" : "warning",
        queueSucceeded && telegramResult?.mode === "server"
          ? "تم إرسال تقرير الإيصال إلى الإدارة متضمنًا رقم الإيصال والمبلغ."
          : queueSucceeded
            ? `تم حفظ الإيصال بنجاح. تعذر إرسال الإشعار للإدارة (${telegramResult?.error || "خطأ في الاتصال"}).`
            : "تم حفظ الإيصال، لكن تعذر إرسال الإشعار التلقائي للإدارة في هذه اللحظة.",
      );
    } catch (error) {
      showTemporaryStatus(
        setReceiptStatusMessage,
        "warning",
        error.message ||
          "تم حفظ الإيصال محليًا لكن تعذر تصديره أو إرسال إشعار الإدارة الآن.",
      );
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const openCalculator = (target, currentValue) => {
    setActiveCalculatorTarget(target);
    setCalcDisplay(String(currentValue ?? "0") || "0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);

    if (target === "edit") {
      setShowEditKeypad(true);
      return;
    }

    setShowKeypad(true);
  };

  const handleDigit = (digit) => {
    setCalcDisplay((current) =>
      appendCalculatorDigit({
        display: current,
        waitingForOperand,
        digit,
      }),
    );
    setWaitingForOperand(false);
  };

  const handleOperator = (nextOperator) => {
    const nextState = applyCalculatorOperator({
      display: calcDisplay,
      prevValue,
      operator,
      nextOperator,
    });

    setCalcDisplay(nextState.display);
    setPrevValue(nextState.prevValue);
    setOperator(nextState.operator);
    setWaitingForOperand(nextState.waitingForOperand);
  };

  const handleEquals = () => {
    const nextState = resolveCalculatorValue({
      display: calcDisplay,
      prevValue,
      operator,
    });

    setCalcDisplay(nextState.display);
    setPrevValue(nextState.prevValue);
    setOperator(nextState.operator);
    setWaitingForOperand(nextState.waitingForOperand);
  };

  const handleCalculatorDelete = () => {
    if (waitingForOperand) {
      setWaitingForOperand(false);
      setCalcDisplay("0");
      return;
    }

    setCalcDisplay((current) =>
      current.length > 1 ? current.slice(0, -1) : "0",
    );
  };

  const applyCalculatorValue = () => {
    const resolvedValue = resolveCalculatorValue({
      display: calcDisplay,
      prevValue,
      operator,
    }).display;

    if (activeCalculatorTarget === "edit") {
      setNewAmount(resolvedValue);
      setShowEditKeypad(false);
      return;
    }

    setAmount(resolvedValue);
    setShowKeypad(false);
  };

  const handleReplyToAdmin = async () => {
    const cleanMessage = toEnglishDigits(replyMessage).trim();
    if (!cleanMessage) {
      await window.appAlert("اكتب ردك أولًا قبل الإرسال.");
      return;
    }

    setIsSendingReply(true);

    try {
      const sentAt = new Date().toISOString();
      const replyEntry = {
        id: Date.now(),
        sender: "partner",
        text: cleanMessage,
        sentAt,
      };

      setLivePartnerMessage({
        partnerId,
        partnerName,
        text: cleanMessage,
        sentAt,
        sender: "partner",
        thread: [...messageThread, replyEntry].slice(-50),
      });

      await submitPartnerReplyToServer({
        partnerId,
        partnerName,
        text: cleanMessage,
        sentAt,
      });
      setIsPartnerConversationOpen(true);
      setReplyMessage("");
      showTemporaryStatus(
        setEditStatusMessage,
        "success",
        "تم إرسال ردك إلى الإدارة داخل التطبيق.",
      );
    } catch (error) {
      showTemporaryStatus(
        setEditStatusMessage,
        "warning",
        error.message || "تعذر إرسال الرد إلى الإدارة الآن.",
      );
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!newAmount || Number(newAmount) <= 0) {
      await window.appAlert("الرجاء إدخال مبلغ صحيح للتعديل.");
      return;
    }

    const nextNote = showEditNoteField ? toEnglishDigits(newNote).trim() : "";
    const nextAmount = parseFloat(newAmount);
    if (editModalConfig?.mode === "direct") {
      const nextRecord = {
        ...editModalConfig.record,
        amount: nextAmount,
        note: nextNote,
        isEdited: true,
        editedAt: new Date().toISOString(),
      };

      updateLedgerRecord?.(partnerId, editModalConfig.recordId, {
        amount: nextAmount,
        note: nextNote,
        isEdited: true,
        editedAt: nextRecord.editedAt,
      });
      setEditModalConfig(null);
      setNewAmount("");
      setNewNote("");
      setShowEditNoteField(false);
      showTemporaryStatus(
        setEditStatusMessage,
        "info",
        "تم تعديل الإيصال مباشرة. جارٍ مزامنته مع الإدارة...",
      );

      try {
        await syncLedgerRecordToServer?.(nextRecord);
        showTemporaryStatus(
          setEditStatusMessage,
          "success",
          "تم تعديل الإيصال مباشرة وتحديثه لدى الإدارة.",
        );
      } catch (syncError) {
        try {
          await queueReceiptForAdmin({
            partnerId,
            partnerName,
            record: nextRecord,
          });
          showTemporaryStatus(
            setEditStatusMessage,
            "success",
            "تم تعديل الإيصال وحفظ نسخة المزامنة البديلة للإدارة.",
          );
        } catch (fallbackError) {
          showTemporaryStatus(
            setEditStatusMessage,
            "warning",
            "تم تعديل الإيصال في هذه الواجهة، لكن تعذرت مزامنته مع الإدارة الآن.",
          );
        }
      }
      return;
    }

    showTemporaryStatus(
      setEditStatusMessage,
      "info",
      "تم حفظ طلب المراجعة. جارٍ إرساله إلى الإدارة...",
    );

    try {
      await requestLedgerEdit(
        partnerId,
        partnerName,
        editModalConfig.recordId,
        editModalConfig.oldAmount,
        nextAmount,
        nextNote,
      );
      setEditModalConfig(null);
      setNewAmount("");
      setNewNote("");
      setShowEditNoteField(false);
      showTemporaryStatus(
        setEditStatusMessage,
        "success",
        "تم إرسال طلب مراجعة الإيصال إلى الإدارة بنجاح.",
      );
    } catch (error) {
      showTemporaryStatus(
        setEditStatusMessage,
        "warning",
        error.message || "تعذر إرسال طلب المراجعة إلى الإدارة الآن.",
      );
    }
  };

  const resetCalculator = () => {
    setCalcDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const exportStatementAsExcel = async () => {
    const rowsHtml = sortedPartnerLedger
      .map(({ record, fallbackNumber }) => {
        const breakdown = calculateLedgerBreakdown(
          record.amount,
          globalSettings,
        );
        return `
 <tr>
 <td>${getReceiptNumber(record, fallbackNumber)}</td>
 <td>${formatDateTime(record.date)}</td>
 <td>${formatNumber(record.amount)}</td>
 <td>${record.note || ""}</td>
 <td>${getLedgerRecordStatus(record)}</td>
 <td>${formatNumber(breakdown.net)}</td>
 </tr>
 `;
      })
      .join("");

    const workbookHtml = `
 <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
 <head>
 <meta charset="utf-8" />
 <style>
 body { font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 24px; }
 h1 { color: #b91c1c; }
 .meta { margin-bottom: 18px; color: #334155; font-size: 13px; }
 table { border-collapse: collapse; width: 100%; }
 th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
 th { background: #fee2e2; color: #7f1d1d; }
 </style>
 </head>
 <body>
 <h1>سجلاتي - كشف حساب الإيصالات</h1>
 <div class="meta">
 <div>الاسم: ${partnerName}</div>
 <div>التاريخ: ${formatDateTime(new Date())}</div>
 <div>إجمالي الإيصالات: ${partnerLedger.length}</div>
 <div>إجمالي المؤكد: ${formatNumber(summary.net)} ريال</div>
 </div>
 <table>
 <thead>
 <tr>
 <th>#</th>
 <th>التاريخ</th>
 <th>المبلغ</th>
 <th>البيان</th>
 <th>الحالة</th>
 <th>الصافي</th>
 </tr>
 </thead>
 <tbody>${rowsHtml}</tbody>
 </table>
 </body>
 </html>
 `;

    const blob = new Blob(["\ufeff", workbookHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    downloadBlobFile(
      blob,
      `Sijilati_Statement_${partnerName}_${new Date().toISOString().slice(0, 10)}.xls`,
    );
  };

  const exportStatementAsPdf = async (forceSorted = false) => {
    if (!statementExportRef.current) {
      throw new Error("تعذر تجهيز كشف الحساب الآن.");
    }

    const imageData = await captureNodeAsPng(
      statementExportRef.current,
      "#FFFFFF",
      2,
    );
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth() - 20;
    const pageHeight = pdf.internal.pageSize.getHeight() - 20;
    const imageProps = pdf.getImageProperties(imageData);
    const imageHeight = (imageProps.height * pageWidth) / imageProps.width;

    let remainingHeight = imageHeight;
    let position = 10;

    pdf.addImage(imageData, "PNG", 10, position, pageWidth, imageHeight);
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      position = remainingHeight - imageHeight + 10;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", 10, position, pageWidth, imageHeight);
      remainingHeight -= pageHeight;
    }

    pdf.save(
      `Sijilati_Statement_${partnerName}_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

  const handleExportStatement = async (format, forceSorted = false) => {
    if (!partnerLedger.length) {
      await window.appAlert("لا يوجد سجل إيصالات حاليًا لتصديره.");
      return;
    }

    if (forceSorted) setIsExportingSorted(true);
    else setIsExportingStatement(true);

    // Wait for state to update and re-render the sorted template
    window.setTimeout(async () => {
      try {
        if (format === "excel") {
          await exportStatementAsExcel();
        } else {
          await exportStatementAsPdf(forceSorted);
        }
        setShowExportOptions(false);
      } catch (error) {
        await window.appAlert(error.message || "تعذر إنشاء ملف التصدير الآن.");
      } finally {
        setIsExportingStatement(false);
        setIsExportingSorted(false);
      }
    }, 150);
  };

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) {
      await window.appAlert(
        `${getInstallInstructions(`${partnerLabels.installTitle} ${partnerName}`)} سيتم تثبيت ${partnerLabels.installTitle} ${partnerName} فقط كواجهة مستقلة خاصة ${partnerLabels.roleObject}.`,
        "تثبيت الواجهة الخاصة",
      );
      return;
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredInstallPrompt(null);
      setInstallProfile({
        mode: "partner",
        partnerId,
        partnerName,
        partnerGender,
      });
      await window.appAlert(
        `تم طلب تثبيت ${partnerLabels.installTitle} ${partnerName} فقط. ستعمل هذه الواجهة بشكل مستقل ${partnerLabels.roleObject} لتسجيل الإيصالات واستلام رسائل الإدارة بدون أي صلاحيات إدارة.`,
        "تثبيت الواجهة الخاصة",
      );
    }
  };

  return (
    <div
      className={`min-h-screen font-['Changa',_sans-serif] text-right transition-all duration-500 overflow-x-hidden ${
        isDarkMode
          ? "dark bg-[#0B0E12] text-white"
          : "bg-[#F8FAFC] text-slate-900"
      }`}
      dir="rtl"
    >
      <style>{`
 :root {
 --primary-color: ${themeColor};
 --primary-glow: ${themeColor}4D;
 --primary-hover: ${themeColor}CC;
 --primary-faint: ${themeColor}1A;
 --app-bg: ${isDarkMode ? "#0B0E12" : "#F8FAFC"};
 }
 body {
 background-color: var(--app-bg) !important;
 }
 `}</style>

      <div
        className={`max-w-md mx-auto min-h-screen relative shadow-2xl bg-[var(--app-bg)] ${isStandaloneMode ? "pb-20" : "pb-36"}`}
      >
        <div className="p-6 pb-2">
          <div
            className={`rounded-[2rem] border px-5 py-4 ${isDarkMode ? "bg-[#141A21] border-white/5" : "bg-white border-slate-200 shadow-sm"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-16 h-16 rounded-[1.6rem] bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center shrink-0">
                  <Users size={26} />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {partnerLabels.installTitle}
                  </p>
                  <h2
                    className={`text-xl font-black mt-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    {partnerName} <span className="text-[10px] text-emerald-500 font-bold mr-2">بارك الله لك في رزقك</span>
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const nextOpenState = !showNotifications;
                    setShowNotifications(nextOpenState);
                    setActiveNotificationTab("incoming");
                    if (nextOpenState) {
                      onOpenNotifications?.();
                    }
                  }}
                  className={`relative p-3 rounded-xl border transition-all ${
                    isDarkMode
                      ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      : "bg-white border-slate-200 text-slate-700 shadow-sm"
                  }`}
                  title="الإشعارات"
                >
                  <Bell size={18} />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white shadow-sm">
                      {totalNotifications}
                    </span>
                  )}
                </button>
                <button
                  onClick={onOpenSettings}
                  className={`p-3 rounded-xl border transition-all ${
                    isDarkMode
                      ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      : "bg-white border-slate-200 text-slate-700 shadow-sm"
                  }`}
                  title={`إعدادات ${partnerLabels.installTitle}`}
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-start">
              <div
                className={`inline-flex px-3 py-2 rounded-xl text-[10px] font-black ${pendingRequests.length > 0 ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : isDarkMode ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}
              >
                {pendingRequests.length > 0
                  ? `${pendingRequests.length} طلب قيد المراجعة`
                  : "لا توجد طلبات معلقة"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {editStatusMessage && (
            <StatusNotice
              isDarkMode={isDarkMode}
              tone={editStatusMessage.tone}
              text={editStatusMessage.text}
              className="mb-4"
            />
          )}

          <div
            className={`mb-8 rounded-[2rem] border p-6 ${isDarkMode ? "bg-[#141A21] border-white/5" : "bg-white border-slate-200 shadow-sm"}`}
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <BellRing size={22} />
              </div>
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                >
                  رسائل الإدارة
                </p>
                <h3
                  className={`text-lg font-black mt-0.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  التنبيهات والملاحظات
                </h3>
              </div>
            </div>

            {messageThread.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar space-y-3">
                {messageThread
                  .filter((m) => m.sender !== "partner")
                  .map((entry) => (
                    <div
                      key={entry.id || `${entry.sender}-${entry.sentAt}`}
                      className={`p-4 rounded-2xl border ${
                        isDarkMode
                          ? "bg-amber-500/10 border-amber-500/20 text-white"
                          : "bg-amber-50 border-amber-200 text-slate-900 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                          من: الإدارة
                        </span>
                        <span className="text-[9px] font-bold opacity-60">
                          {formatDateTime(entry.sentAt)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold leading-relaxed whitespace-pre-wrap">
                        {entry.text === "__RESET__"
                          ? "تم تصفير سجلاتك بنجاح والبدء من جديد. نتمنى لك التوفيق!"
                          : entry.text}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p
                className={`text-xs text-center py-4 font-bold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
              >
                لا توجد رسائل جديدة من الإدارة
              </p>
            )}
          </div>
          {pendingRequests.length > 0 && (
            <div
              className={`p-5 rounded-[2rem] border mb-6 ${isDarkMode ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"}`}
            >
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-500">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-indigo-600 mb-1">
                    طلبات مرفوعة للإدارة
                  </h3>
                  <p className="text-[11px] font-bold leading-relaxed text-indigo-700">
                    لديك {pendingRequests.length} طلب{" "}
                    {pendingRequests.length === 1 ? "تعديل" : "تعديلات"} قيد
                    المراجعة لدى الإدارة. ستظهر هنا كمرجع لك، بينما التنبيه
                    الأساسي موجّه للإدارة.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div
            className={`mt-10 p-6 rounded-[2.5rem] border ${isDarkMode ? "bg-[#141A21] border-white/5 shadow-2xl" : "bg-white border-slate-100 shadow-lg"}`}
          >
            <div className="grid grid-cols-2 gap-4">
              <SummaryBox
                isDarkMode={isDarkMode}
                label="إجمالي المبالغ"
                value={summary.gross}
                accent="slate"
              />
              <SummaryBox
                isDarkMode={isDarkMode}
                label="الصافي المستحق"
                value={summary.net}
                accent="indigo"
              />
              <SummaryBox
                isDarkMode={isDarkMode}
                label={`الخصم (${partyBPct}%)`}
                value={summary.discount}
                accent="rose"
              />
              <SummaryBox
                isDarkMode={isDarkMode}
                label="العمولة البنكية"
                value={summary.bankComm}
                accent="orange"
              />
            </div>
          </div>

          {isResetMode && (
            <div
              className={`mb-6 p-6 rounded-[2.5rem] border-2 text-center relative overflow-hidden ${
                isDarkMode
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <RefreshCcw size={64} className="animate-spin-slow" />
              </div>
              <div className="relative z-10">
                <div
                  className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${isDarkMode ? "bg-emerald-500/20" : "bg-emerald-500 text-white shadow-lg"}`}
                >
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-lg font-black mb-2">
                  تم تصفير الحساب بنجاح
                </h3>
                <p className="text-xs font-bold opacity-80 leading-relaxed">
                  لقد قامت الإدارة بتسوية وتصفير حسابك السابق.
                  <br />
                  يمكنك الآن البدء بإضافة إيصالات الدورة الجديدة.
                </p>
              </div>
            </div>
          )}

          <div
            className={`mt-12 p-6 rounded-[2.5rem] border ${isDarkMode ? "bg-[#141A21] border-white/5 shadow-2xl" : "bg-white border-slate-100 shadow-xl"}`}
          >
            <h3
              className={`text-sm font-black mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              تسجيل إيصال جديد
            </h3>

            <div className="space-y-3 text-right">
              <div className="px-1">
                <label
                  className={`${isDarkMode ? "text-slate-400" : "text-slate-500"} text-[10px] font-bold uppercase tracking-wider`}
                >
                  صورة الإيصال
                </label>
              </div>
              <div
                className={`w-full rounded-2xl border border-dashed px-4 py-8 transition-all relative ${
                  isDarkMode
                    ? "bg-black/20 border-white/10 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                       e.stopPropagation();
                    }}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await handlePasteReceiptImage();
                    }}
                    className={`px-8 py-3.5 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl ${
                      isDarkMode
                        ? "bg-[var(--primary-color)] text-white shadow-[var(--primary-color)]/20"
                        : "bg-[var(--primary-color)] text-white shadow-[var(--primary-color)]/30"
                    }`}
                  >
                    <ClipboardPaste size={20} strokeWidth={2.5} />
                    <span className="text-sm font-black">لصق لقطة الشاشة</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleChooseReceiptImage();
                  }}
                  className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-all active:scale-95 border ${
                    isDarkMode
                      ? "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      : "bg-white border-slate-200 text-slate-500 shadow-sm"
                  }`}
                  title="اختيار صورة من المعرض"
                >
                  <ImagePlus size={18} />
                </button>
              </div>
              <input
                ref={receiptImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleReceiptImageChange}
                className="sr-only"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0,0,0,0)",
                  border: 0,
                }}
              />
            </div>

            {receiptImage && (
              <div
                className={`mt-4 rounded-2xl border p-3 flex items-center justify-between gap-3 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={receiptImage.dataUrl}
                    alt="صورة الإيصال"
                    className="w-16 h-16 rounded-xl object-cover border border-white/10"
                  />
                  <div className="text-right">
                    <p
                      className={`text-xs font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                    >
                      {receiptImage.fileName}
                    </p>
                    <p
                      className={`text-[10px] font-bold mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {receiptImage.width}x{receiptImage.height}
                    </p>
                    <p
                      className={`text-[10px] font-bold mt-1 ${receiptImageSource === "paste" ? "text-emerald-500" : isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                    >
                      {receiptImageSource === "paste"
                        ? "تم لصق الصورة من الحافظة"
                        : "تم اختيار الصورة من الجهاز"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewImage(receiptImage)}
                    className={`p-2.5 rounded-xl ${isDarkMode ? "bg-white/10 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
                    title="معاينة الصورة"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => setReceiptImage(null)}
                    className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"
                    title="حذف الصورة"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <CustomInput
                label="المبلغ"
                value={amount}
                icon={Banknote}
                onCalcClick={() => openCalculator("amount", amount)}
                onChange={setAmount}
                isDarkMode={isDarkMode}
              />
            </div>

            <button
              onClick={() => setShowNoteField((prev) => !prev)}
              className={`w-full mt-4 p-3.5 rounded-2xl border text-sm font-black flex items-center justify-center gap-2 transition-all ${
                isDarkMode
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[var(--primary-color)]"
              }`}
            >
              <MessageSquareText
                size={16}
                className="text-[var(--primary-color)]"
              />
              {showNoteField
                ? "إخفاء البيان / الملاحظة"
                : "إضافة بيان / ملاحظة"}
            </button>

            {showNoteField && (
              <div className="overflow-hidden">
                <div className="space-y-2 text-right mt-4">
                  <label
                    className={`${isDarkMode ? "text-slate-400" : "text-slate-500"} text-[10px] font-bold uppercase tracking-wider mr-1`}
                  >
                    البيان / الملاحظة
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(toEnglishDigits(e.target.value))}
                    placeholder="مثال: تحويل الراجحي"
                    className={`w-full rounded-2xl py-4 px-4 text-sm font-bold outline-none border transition-all h-24 resize-none ${
                      isDarkMode
                        ? "bg-black/20 border-white/10 text-white focus:border-[var(--primary-color)]"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--primary-color)] shadow-inner"
                    }`}
                  />
                </div>
              </div>
            )}

            {receiptStatusMessage && (
              <StatusNotice
                isDarkMode={isDarkMode}
                tone={receiptStatusMessage.tone}
                text={receiptStatusMessage.text}
                className="mt-4"
              />
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleAddReceipt}
                disabled={isSubmittingReceipt}
                className="flex-1 p-4 rounded-2xl bg-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                {isSubmittingReceipt ? "جاري الإرسال..." : "إضافة وإرسال"}
              </button>
              <button
                onClick={() => handleExportStatement("pdf")}
                disabled={isExportingStatement}
                className={`p-4 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${
                  isDarkMode
                    ? "bg-white/5 border-white/10 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
                title="تصدير كشف حساب"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          {partnerLedger.length > 0 && (
            <div className="mt-14 mb-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3
                  className={`text-sm font-black flex items-center gap-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  سجل الإيصالات ({partnerLedger.length})
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-3 px-2">
                <MiniStatPill
                  isDarkMode={isDarkMode}
                  label="المقيدة"
                  value={receiptStats.confirmed}
                  accent="slate"
                />
                <MiniStatPill
                  isDarkMode={isDarkMode}
                  label="بانتظار التأكيد"
                  value={receiptStats.pending}
                  accent="rose"
                />
                <MiniStatPill
                  isDarkMode={isDarkMode}
                  label="المجمدة"
                  value={receiptStats.frozen}
                  accent="orange"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 px-2">
                <button
                  type="button"
                  onClick={() =>
                    setSortDirection((current) =>
                      current === "desc" ? "asc" : "desc",
                    )
                  }
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[11px] font-black transition-all active:scale-95 ${
                    isDarkMode
                      ? "bg-white/5 text-slate-400 border border-white/5"
                      : "bg-slate-50 text-slate-600 border border-slate-200 shadow-sm"
                  }`}
                >
                  <ArrowUpDown size={15} className="text-amber-500" />
                  <span>
                    ترتيب العرض:{" "}
                    {sortDirection === "desc"
                      ? "من الأحدث للأقدم"
                      : "من الأقدم للأحدث"}
                  </span>
                </button>
              </div>
            </div>
          )}
          <div className="mb-6">
            {sortedPartnerLedger.map(({ record, fallbackNumber }) => {
              const hasPendingRequest = pendingRequests.some(
                (req) => req.recordId === record.id,
              );
              const canEditDirectly = isWithinDirectEditWindow(record);
              const receiptNumber = getReceiptNumber(record, fallbackNumber);

              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-2xl border-2 transition-all hover:scale-[1.01] mb-5 ${getStatusBorderClass(getLedgerRecordStatus(record), isDarkMode)} ${isDarkMode ? "bg-[#141A21]" : "bg-white shadow-sm"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}
                      >
                        <span className="text-sm font-black">
                          {receiptNumber}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                          >
                            {formatNumber(record.amount)} ريال
                          </span>
                          <SharedStatusBadge
                            status={getLedgerRecordStatus(record)}
                          />
                          {hasPendingRequest && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[8px] font-black border border-orange-500/20">
                              <Clock size={8} /> قيد المراجعة
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[10px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {formatDateTime(record.date || record.createdAt)}
                        </p>
                        {record.note && (
                          <p
                            className={`text-[11px] font-bold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                          >
                            {record.note}
                          </p>
                        )}
                        {(record.imageDataUrl || record.imageUrl) && (
                          <button
                            onClick={() =>
                              setPreviewImage({
                                dataUrl: record.imageDataUrl || record.imageUrl,
                                fileName: record.imageName || "receipt.jpg",
                              })
                            }
                            className="inline-flex items-center gap-1.5 text-[10px] font-black text-[var(--primary-color)]"
                          >
                            <Eye size={12} />
                            معاينة صورة الإيصال
                          </button>
                        )}
                        {record.telegramStatus && (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ${getTelegramToneClass(getTelegramStatusTone(record.telegramStatus))}`}
                          >
                            {getTelegramStatusLabel(record.telegramStatus)}
                          </span>
                        )}
                      </div>
                    </div>

                    {canEditDirectly && (
                      <button
                        onClick={() => {
                          setEditModalConfig({
                            recordId: record.id,
                            oldAmount: record.amount,
                            oldNote: record.note,
                            record,
                            mode: "direct",
                          });
                          setNewAmount(record.amount.toString());
                          setNewNote(record.note || "");
                          setShowEditNoteField(Boolean(record.note));
                        }}
                        className="p-2.5 rounded-xl text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex gap-2">
                      {canEditDirectly && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}
                        >
                          <Clock size={10} />
                          متاح للتعديل المباشر
                        </span>
                      )}
                    </div>

                    {!canEditDirectly && (
                      <button
                        onClick={() => {
                          if (expandedRecordId === record.id) {
                            setExpandedRecordId(null);
                          } else {
                            setExpandedRecordId(record.id);
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                          hasPendingRequest
                            ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400"
                            : "bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 shadow-sm"
                        }`}
                      >
                        <Edit2 size={14} />
                        تعديل
                      </button>
                    )}
                  </div>

                  {expandedRecordId === record.id && (
                    <div className={`mt-4 pt-4 border-t ${isDarkMode ? "border-white/5" : "border-slate-100"}`}>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`p-3 rounded-xl ${isDarkMode ? "bg-white/5" : "bg-slate-50"}`}>
                          <p className="text-[9px] font-black opacity-50 mb-1">الصافي المتوقع</p>
                          <p className="text-xs font-black">{formatNumber(calculateLedgerBreakdown(record.amount, globalSettings).net)} ريال</p>
                        </div>
                        <div className={`p-3 rounded-xl ${isDarkMode ? "bg-white/5" : "bg-slate-50"}`}>
                          <p className="text-[9px] font-black opacity-50 mb-1">تاريخ العملية</p>
                          <p className="text-[10px] font-bold">{formatDateTime(record.date || record.createdAt)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (hasPendingRequest) return;
                          setEditModalConfig({
                            recordId: record.id,
                            oldAmount: record.amount,
                            oldNote: record.note,
                            record,
                            mode: "request",
                          });
                          setNewAmount(record.amount.toString());
                          setNewNote(record.note || "");
                          setShowEditNoteField(Boolean(record.note));
                        }}
                        className="w-full py-3 rounded-xl bg-indigo-500 text-white text-[10px] font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                      >
                        تقديم طلب تعديل للإدارة
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Keypad
          isOpen={showKeypad}
          onClose={() => setShowKeypad(false)}
          display={calcDisplay}
          prevValue={prevValue}
          operator={operator}
          onDigit={handleDigit}
          onOperator={handleOperator}
          onClear={resetCalculator}
          onDelete={handleCalculatorDelete}
          onEquals={handleEquals}
          onConfirm={applyCalculatorValue}
          isDarkMode={isDarkMode}
        />

        {showNotifications && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <div
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <div
              className={`relative w-full max-w-sm rounded-[2rem] p-5 shadow-2xl border ${isDarkMode ? "bg-[#1A222B] border-white/10" : "bg-white border-slate-200"}`}
            >
              <div className="flex items-center justify-between gap-3 pb-3 border-b text-right mb-4">
                <button
                  onClick={() => setShowNotifications(false)}
                  className={`p-2 rounded-xl ${isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}
                >
                  <X size={16} />
                </button>
                <div className="flex-1">
                  <h3
                    className={`text-sm font-black text-right ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    الإشعارات ({totalNotifications})
                  </h3>
                </div>
              </div>

              <div
                className={`grid grid-cols-2 gap-2 p-1 rounded-2xl mb-4 ${isDarkMode ? "bg-white/5" : "bg-slate-100"}`}
              >
                <button
                  onClick={() => setActiveNotificationTab("incoming")}
                  className={`py-2.5 rounded-xl text-[11px] font-black transition-all ${activeNotificationTab === "incoming" ? "bg-[var(--primary-color)] text-white shadow-lg" : isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                >
                  الإشعارات الواردة
                </button>
                <button
                  onClick={() => setActiveNotificationTab("archive")}
                  className={`py-2.5 rounded-xl text-[11px] font-black transition-all ${activeNotificationTab === "archive" ? "bg-[var(--primary-color)] text-white shadow-lg" : isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                >
                  سجل الإشعارات
                </button>
              </div>

              {activeNotificationTab === "incoming" ? (
                notificationHistory.length > 0 ? (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
                    {notificationHistory.slice(0, 12).map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded-2xl border p-3 text-right ${isDarkMode ? "bg-sky-500/10 border-sky-500/20" : "bg-sky-50 border-sky-100"}`}
                      >
                        <p
                          className={`text-[11px] font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                        >
                          {entry.title}
                        </p>
                        <p
                          className={`text-[10px] font-bold leading-6 mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                        >
                          {entry.body}
                        </p>
                        <p
                          className={`text-[9px] font-black mt-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                        >
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`text-xs text-center py-10 font-bold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                  >
                    لا توجد إشعارات جديدة
                  </p>
                )
              ) : notificationArchive.length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
                  {notificationArchive.slice(0, 20).map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-2xl border p-3 text-right ${isDarkMode ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50 border-violet-100"}`}
                    >
                      <p
                        className={`text-[11px] font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                      >
                        {entry.title}
                      </p>
                      <p
                        className={`text-[10px] font-bold leading-6 mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                      >
                        {entry.body}
                      </p>
                      <p
                        className={`text-[9px] font-black mt-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                      >
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className={`text-xs text-center py-10 font-bold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                >
                  لا يوجد سجل محفوظ بعد
                </p>
              )}
            </div>
          </div>
        )}

        {blessingModal && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              onClick={() => setBlessingModal(null)}
            />
            <div
              className={`relative w-full max-w-sm rounded-[2.4rem] border p-6 shadow-2xl ${isDarkMode ? "bg-[#141A21] border-emerald-500/20" : "bg-white border-emerald-200"}`}
            >
              <button
                onClick={() => setBlessingModal(null)}
                className={`absolute top-4 left-4 p-2 rounded-xl ${isDarkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                <X size={16} />
              </button>
              <div className="w-full flex flex-col items-center text-center">
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-500 mb-3">
                  <Sparkles size={20} />
                </div>
                <div className="w-full">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500">
                    رسالة اليوم
                  </p>
                  <h3
                    className={`text-lg font-black mt-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    أهلًا {partnerName}
                  </h3>
                  <p
                    className={`text-sm font-bold leading-7 mt-3 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {blessingModal.body}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBlessingModal(null)}
                className="w-full mt-5 py-3 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-500/20"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {editModalConfig && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div
              onClick={() => setEditModalConfig(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <div
              className={`relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl ${isDarkMode ? "bg-[#141A21] border border-white/10" : "bg-white border border-slate-200"}`}
            >
              <button
                onClick={() => setEditModalConfig(null)}
                className={`absolute top-6 left-6 p-2 rounded-xl ${isDarkMode ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}
              >
                <X size={18} />
              </button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                  <Edit2 size={28} />
                </div>
                <h3
                  className={`text-xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  {editModalConfig?.mode === "direct"
                    ? "تعديل مباشر للإيصال"
                    : "طلب مراجعة إيصال"}
                </h3>
              </div>
              <div className="space-y-5">
                <CustomInput
                  label="المبلغ الجديد"
                  value={newAmount}
                  icon={Banknote}
                  onCalcClick={() => openCalculator("edit", newAmount)}
                  onChange={setNewAmount}
                  isDarkMode={isDarkMode}
                />
                <button
                  onClick={() => setShowEditNoteField((prev) => !prev)}
                  className={`w-full p-3.5 rounded-2xl border text-sm font-black flex items-center justify-center gap-2 transition-all ${isDarkMode ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[var(--primary-color)]"}`}
                >
                  <MessageSquareText
                    size={16}
                    className="text-[var(--primary-color)]"
                  />
                  {showEditNoteField
                    ? "إخفاء البيان / السبب"
                    : "إضافة سبب التعديل / البيان"}
                </button>
                {showEditNoteField && (
                  <div className="overflow-hidden">
                    <div className="space-y-2 text-right mt-4">
                      <label
                        className={`${isDarkMode ? "text-slate-400" : "text-slate-500"} text-[10px] font-bold uppercase tracking-wider mr-1`}
                      >
                        سبب التعديل / البيان الجديد
                      </label>
                      <textarea
                        value={newNote}
                        onChange={(e) =>
                          setNewNote(toEnglishDigits(e.target.value))
                        }
                        placeholder="اكتب سبب التعديل بوضوح..."
                        className={`w-full rounded-2xl py-4 px-4 text-sm font-bold outline-none border transition-all h-24 resize-none ${isDarkMode ? "bg-black/20 border-white/10 text-white focus:border-[var(--primary-color)]" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--primary-color)] shadow-inner"}`}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleRequestEdit}
                  className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-transform"
                >
                  {editModalConfig?.mode === "direct"
                    ? "حفظ التعديل المباشر"
                    : "إرسال طلب المراجعة للإدارة"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showExportOptions && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <div
              onClick={() =>
                !isExportingStatement && setShowExportOptions(false)
              }
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <div
              className={`relative w-full max-w-sm rounded-[2.2rem] p-6 shadow-2xl ${isDarkMode ? "bg-[#141A21] border border-white/10" : "bg-white border border-slate-200"}`}
            >
              <h3
                className={`text-lg font-black mb-2 text-center ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                تصدير كشف الحساب
              </h3>
              <p
                className={`text-[11px] font-bold leading-6 text-center mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
              >
                اختر نوع الملف المطلوب لتصدير كشف الإيصالات الخاص بك بهوية
                سجلاتي.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => handleExportStatement("pdf")}
                  disabled={isExportingStatement}
                  className="w-full py-4 rounded-2xl bg-[var(--primary-color)] text-white font-black text-sm shadow-lg disabled:opacity-60"
                >
                  {isExportingStatement ? "جارٍ تجهيز الملف..." : "تصدير PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => handleExportStatement("excel")}
                  disabled={isExportingStatement}
                  className={`w-full py-4 rounded-2xl border font-black text-sm transition-all disabled:opacity-60 ${isDarkMode ? "bg-white/5 border-white/10 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                >
                  تصدير Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
            <div
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <div
              className={`relative w-full max-w-md rounded-[2rem] p-4 ${isDarkMode ? "bg-[#141A21] border border-white/10" : "bg-white border border-slate-200"}`}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className={`absolute top-4 left-4 p-2 rounded-xl z-10 ${isDarkMode ? "bg-black/40 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                <X size={16} />
              </button>
              <img
                src={previewImage.dataUrl}
                alt={previewImage.fileName || "صورة الإيصال"}
                className="w-full max-h-[70vh] object-contain rounded-[1.5rem]"
              />
              {previewImage.fileName && (
                <p
                  className={`text-center text-[11px] font-black mt-3 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                >
                  {previewImage.fileName}
                </p>
              )}
            </div>
          </div>
        )}

        <Keypad
          isOpen={showEditKeypad}
          onClose={() => setShowEditKeypad(false)}
          display={calcDisplay}
          prevValue={prevValue}
          operator={operator}
          onDigit={handleDigit}
          onOperator={handleOperator}
          onClear={resetCalculator}
          onDelete={handleCalculatorDelete}
          onEquals={handleEquals}
          onConfirm={applyCalculatorValue}
          isDarkMode={isDarkMode}
        />

        {!isStandaloneMode && (
          <div className="fixed bottom-0 left-0 right-0 z-[1003] max-w-md mx-auto p-4">
            <div
              className={`rounded-[1.8rem] border p-3 shadow-2xl backdrop-blur-xl ${
                isDarkMode
                  ? "bg-[#0B0E12]/90 border-white/10"
                  : "bg-white/90 border-slate-200"
              }`}
            >
              <button
                onClick={handleInstallApp}
                className="w-full py-4 rounded-2xl bg-[var(--primary-color)] text-white font-black text-sm shadow-lg shadow-[var(--primary-color)]/20"
              >
                تثبيت {partnerLabels.installTitle} {partnerName}
              </button>
            </div>
          </div>
        )}
      </div>

      {(isExportingStatement || isExportingSorted) && (
        <div className="fixed inset-0 z-[-1] pointer-events-none opacity-0 overflow-hidden flex items-start justify-center bg-white">
          <div
            ref={statementExportRef}
            className="w-[210mm] bg-white p-[20mm] text-right"
            style={{ direction: "rtl", fontFamily: "Changa, sans-serif" }}
          >
            <div className="flex items-center justify-between mb-12 border-b-2 border-slate-100 pb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">
                  كشف حساب الإيصالات
                </h1>
                <p className="text-slate-500 font-bold">هوية سجلاتي المالية</p>
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900">
                  {partnerName}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  {formatDateTime(new Date())}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-12">
              <ExportSummaryCard
                label="إجمالي الإيصالات"
                value={partnerLedger.length}
                accent="slate"
              />
              <ExportSummaryCard
                label="الصافي المستحق"
                value={summary.net}
                accent="indigo"
              />
              <ExportSummaryCard
                label="الخصم الإجمالي"
                value={summary.discount}
                accent="rose"
              />
              <ExportSummaryCard
                label="العمولة البنكية"
                value={summary.bankComm}
                accent="orange"
              />
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-900 border-b-2 border-slate-200">
                  <th className="py-4 px-4 text-right text-xs font-black">#</th>
                  <th className="py-4 px-4 text-right text-xs font-black">
                    التاريخ
                  </th>
                  <th className="py-4 px-4 text-right text-xs font-black">
                    المبلغ
                  </th>
                  <th className="py-4 px-4 text-right text-xs font-black">
                    البيان
                  </th>
                  <th className="py-4 px-4 text-right text-xs font-black">
                    الحالة
                  </th>
                  <th className="py-4 px-4 text-right text-xs font-black">
                    الصافي
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPartnerLedger.map(({ record, fallbackNumber }) => {
                  const breakdown = calculateLedgerBreakdown(
                    record.amount,
                    globalSettings,
                  );
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-4 text-sm font-bold text-slate-900">
                        {getReceiptNumber(record, fallbackNumber)}
                      </td>
                      <td className="py-4 px-4 text-[11px] font-bold text-slate-600">
                        {formatDateTime(record.date || record.createdAt)}
                      </td>
                      <td className="py-4 px-4 text-sm font-black text-slate-900">
                        {formatNumber(record.amount)}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-slate-600">
                        {record.note || "-"}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {getReceiptStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-black text-indigo-600">
                        {formatNumber(breakdown.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-16 pt-8 border-t border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400">
                تم استخراج هذا الكشف آلياً عبر نظام سجلاتي للمحاسبة المالية.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryBox = ({ isDarkMode, label, value, accent = "slate" }) => {
  const accentClass = {
    rose: isDarkMode
      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
      : "bg-rose-50 text-rose-600 border-rose-100",
    orange: isDarkMode
      ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
      : "bg-orange-50 text-orange-600 border-orange-100",
    indigo: isDarkMode
      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
      : "bg-indigo-50 text-indigo-600 border-indigo-100",
    slate: isDarkMode
      ? "bg-white/5 text-white border-white/10"
      : "bg-slate-50 text-slate-900 border-slate-200",
  }[accent];

  return (
    <div
      className={`p-4 rounded-[1.8rem] text-center border shadow-sm transition-transform hover:scale-[1.02] ${accentClass}`}
    >
      <span className="block text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">
        {label}
      </span>
      <span className="text-base font-black tracking-tight">
        {formatNumber(value)}{" "}
        <span className="text-[9px] opacity-60 mr-0.5">ريال</span>
      </span>
    </div>
  );
};

const MiniStatPill = ({ isDarkMode, label, value, accent = "slate" }) => {
  const accentClass = {
    rose: isDarkMode
      ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
      : "bg-rose-50 text-rose-500 border-rose-100",
    orange: isDarkMode
      ? "bg-orange-500/10 text-orange-300 border-orange-500/20"
      : "bg-orange-50 text-orange-500 border-orange-100",
    slate: isDarkMode
      ? "bg-white/5 text-slate-400 border-white/10"
      : "bg-slate-50 text-slate-600 border-slate-200",
  }[accent];

  return (
    <div
      className={`rounded-2xl border px-3 py-4 text-center shadow-sm transition-all hover:shadow-md ${accentClass}`}
    >
      <span className="block text-[9px] font-black leading-none opacity-60 mb-2">
        {label}
      </span>
      <span className="block text-lg font-black leading-none">
        {formatNumber(value)}
      </span>
    </div>
  );
};

const ConversationBubble = ({
  entry,
  senderLabel,
  isOwnMessage,
  isDarkMode,
}) => (
  <div className={`flex ${isOwnMessage ? "justify-start" : "justify-end"}`}>
    <div
      className={`max-w-[86%] rounded-[1.35rem] px-4 py-3 border ${
        isOwnMessage
          ? isDarkMode
            ? "bg-white/5 border-white/10 text-slate-200"
            : "bg-slate-100 border-slate-200 text-slate-800"
          : isDarkMode
            ? "bg-amber-500/15 border-amber-500/20 text-white"
            : "bg-amber-50 border-amber-200 text-slate-900"
      }`}
    >
      <p
        className={`text-[10px] font-black mb-1 ${isOwnMessage ? "text-sky-400" : "text-amber-600"}`}
      >
        {senderLabel}
      </p>
      <p className="text-[12px] font-bold leading-7 whitespace-pre-wrap">
        {entry.text === "__RESET__"
          ? "تم تصفير سجلاتك بنجاح والبدء من جديد."
          : entry.text}
      </p>
      <p
        className={`text-[10px] font-black mt-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
      >
        {formatDateTime(entry.sentAt)}
      </p>
    </div>
  </div>
);

const getStatusLabel = (status) => getReceiptStatusLabel(status);




const getTelegramToneClass = (tone) =>
  ({
    amber: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
  })[tone] || "bg-slate-500/10 text-slate-300 border border-slate-500/20";

const ExportSummaryCard = ({ label, value, accent = "slate" }) => {
  const accentClass =
    {
      rose: "bg-rose-50 text-rose-700 border-rose-100",
      amber: "bg-amber-50 text-amber-700 border-amber-100",
      slate: "bg-slate-100 text-slate-700 border-slate-200",
      emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    }[accent] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className={`rounded-[24px] border p-4 ${accentClass}`}>
      <p className="text-[11px] font-black opacity-75">{label}</p>
      <p className="text-lg font-black mt-3">{value}</p>
    </div>
  );
};

const SharedStatusBadge = ({ status }) => {
  const activeStatus = getStatusLabel(status);

  const activeClass =
    {
      pending: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
      approved:
        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
      rejected: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
      frozen: "bg-slate-500/10 text-slate-300 border border-slate-500/20",
      review: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20",
    }[status] ||
    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[8px] font-black ${activeClass}`}
    >
      {activeStatus}
    </span>
  );
};

const StatusNotice = ({ isDarkMode, tone = "info", text, className = "" }) => {
  const toneClass =
    {
      info: isDarkMode
        ? "bg-sky-500/10 border-sky-500/20 text-sky-300"
        : "bg-sky-50 border-sky-200 text-sky-700",
      success: isDarkMode
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
        : "bg-emerald-50 border-emerald-200 text-emerald-700",
      warning: isDarkMode
        ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
        : "bg-amber-50 border-amber-200 text-amber-700",
    }[tone] ||
    (isDarkMode
      ? "bg-white/5 border-white/10 text-slate-300"
      : "bg-slate-50 border-slate-200 text-slate-700");

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-[11px] font-black leading-6 ${toneClass} ${className}`.trim()}
    >
      {text}
    </div>
  );
};

export default SharedRecordView;
