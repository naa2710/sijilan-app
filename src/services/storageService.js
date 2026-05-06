// Storage service mock - Firebase disabled
export const uploadImage = async () => {
    console.warn('Firebase is disabled. Image upload to Firebase Storage skipped.');
    return null;
};
