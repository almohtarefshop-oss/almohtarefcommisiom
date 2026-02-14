import React, { useState, useEffect, useRef } from 'react';
import { ToastProvider, ModalProvider, ToastContext, ScrollToTopButton } from './components/UIComponents';
import CustomerTab from './components/CustomerTab';
import CommissionTab from './components/CommissionTab';
import ServicesTab from './components/ServicesTab';
import MatchingTab from './components/MatchingTab';
import PhoenixTab from './PhoenixTab';
import SeasonsTab from './components/SeasonsTab';
import { DynamicTab } from './types';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('customerList');
  const [dynamicTabs, setDynamicTabs] = useState<DynamicTab[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = React.useContext(ToastContext);

  useEffect(() => {
    if (theme === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.match('text/html')) {
      if (file) showToast('يرجى اختيار ملف HTML صالح.', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const fileName = file.name.replace(/\.(html|htm)$/i, '');
      const newTab: DynamicTab = {
        id: `htmlTab${Date.now()}`,
        title: fileName,
        content
      };
      setDynamicTabs(prev => [...prev, newTab]);
      setActiveTab(newTab.id);
      e.target.value = '';
    };
    reader.onerror = () => showToast('حدث خطأ أثناء قراءة الملف.', 'error');
    reader.readAsText(file);
  };

  const closeDynamicTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDynamicTabs(prev => prev.filter(t => t.id !== id));
    if (activeTab === id) setActiveTab('customerList');
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="tab-navigation">
          <button className={`tab-button ${activeTab === 'customerList' ? 'active' : ''}`} onClick={() => setActiveTab('customerList')}>قائمة العملاء</button>
          <button className={`tab-button ${activeTab === 'commissionCalculator' ? 'active' : ''}`} onClick={() => setActiveTab('commissionCalculator')}>حساب العمولة</button>
          <button className={`tab-button ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>الخدمات</button>
          <button className={`tab-button ${activeTab === 'matching' ? 'active' : ''}`} onClick={() => setActiveTab('matching')}>مطابقة</button>
          <button className={`tab-button ${activeTab === 'phoenix' ? 'active' : ''}`} onClick={() => setActiveTab('phoenix')}>فينيكس</button>
          <button className={`tab-button ${activeTab === 'seasons' ? 'active' : ''}`} onClick={() => setActiveTab('seasons')}>المواسم</button>
          
          {dynamicTabs.map(tab => (
            <button key={tab.id} className={`tab-button ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.title}
              <button className="close-dynamic-tab-btn" onClick={(e) => closeDynamicTab(tab.id, e)} title="إغلاق التبويب">
                <i className="fas fa-times-circle"></i>
              </button>
            </button>
          ))}

          <button className="tab-button" onClick={() => fileInputRef.current?.click()}>
            <i className="fas fa-plus"></i> إضافة ملف HTML
          </button>
          <input type="file" ref={fileInputRef} accept=".html,.htm" style={{ display: 'none' }} onChange={handleFileUpload} />
        </div>
        <button className="theme-toggle-button" onClick={toggleTheme} title="تبديل الوضع">
          <i className="fas fa-moon"></i>
          <i className="fas fa-sun"></i>
        </button>
      </div>

      <div className="tab-content-area">
        {activeTab === 'customerList' && <CustomerTab />}
        {activeTab === 'commissionCalculator' && <CommissionTab />}
        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'matching' && <MatchingTab />}
        {activeTab === 'phoenix' && <PhoenixTab />}
        {activeTab === 'seasons' && <SeasonsTab />}
        {dynamicTabs.map(tab => (
          activeTab === tab.id && (
            <div key={tab.id} className="tab-content active dynamic-html-content">
              <iframe srcDoc={tab.content} sandbox="allow-forms allow-modals allow-popups allow-presentation"></iframe>
            </div>
          )
        ))}
      </div>
      <ScrollToTopButton />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </ToastProvider>
  );
};

export default App;
