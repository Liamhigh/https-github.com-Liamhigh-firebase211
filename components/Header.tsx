import React from 'react';
import { FileIcon, CalculatorIcon, BriefcaseIcon } from './Icons';
import { VerumOmnisLogo } from './Logo';

interface HeaderProps {
    isEnterpriseMode: boolean;
    onToggleEnterpriseMode: () => void;
    onToggleFilePanel: () => void;
    onNavigateToFirewall: () => void;
    onNavigateToTax: () => void;
    onNavigateToBusiness: () => void;
}

const Header: React.FC<HeaderProps> = ({ isEnterpriseMode, onToggleEnterpriseMode, onToggleFilePanel, onNavigateToFirewall, onNavigateToTax, onNavigateToBusiness }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <button onClick={onToggleFilePanel} className="p-1 text-gray-500 dark:text-gray-400 md:hidden" aria-label="Open file panel">
                <FileIcon className="h-6 w-6" />
            </button>
            <div onClick={onNavigateToFirewall} className="cursor-pointer">
                <VerumOmnisLogo />
            </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
            <button onClick={onNavigateToBusiness} className="flex items-center space-x-2 p-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                <BriefcaseIcon className="h-5 w-5"/>
                <span className="hidden sm:inline">Business Services</span>
            </button>
            <button onClick={onNavigateToTax} className="flex items-center space-x-2 p-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                <CalculatorIcon className="h-5 w-5"/>
                <span className="hidden sm:inline">Tax Services</span>
            </button>
            <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 hidden sm:inline">
                Mode: {isEnterpriseMode ? 'Enterprise' : 'Consumer'}
            </span>
            <label htmlFor="enterprise-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                <input id="enterprise-toggle" type="checkbox" className="sr-only" checked={isEnterpriseMode} onChange={onToggleEnterpriseMode} />
                <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${isEnterpriseMode ? 'transform translate-x-full bg-blue-500' : ''}`}></div>
                </div>
            </label>
        </div>
      </div>
    </header>
  );
};

export default Header;