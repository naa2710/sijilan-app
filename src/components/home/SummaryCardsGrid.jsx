import React from 'react';
import { User, Users } from 'lucide-react';
import StatCard from '../shared/StatCard';

const SummaryCardsGrid = ({ finalA, finalB, partyAName, partyBName, isDarkMode }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <StatCard 
        label={`صافي ${partyAName}`} 
        value={finalA} 
        icon={User} 
        color="bg-blue-600" 
        isDarkMode={isDarkMode}
      />
      <StatCard 
        label={`صافي ${partyBName}`} 
        value={finalB} 
        icon={Users} 
        color="bg-emerald-600" 
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default SummaryCardsGrid;
