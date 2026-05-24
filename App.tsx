import React, { useState, useEffect } from 'react';
import { ref, push, set, onValue, update, remove } from 'firebase/database';
import { Search, Plus, Edit2, LogIn, Calendar, Trash2, CalendarPlus, Settings2, Package, Coins, CheckCircle2, AlertCircle, Share2, Download, FileText, X } from 'lucide-react';
import { db } from './firebase';
import { Client } from './types';

const INITIAL_CLIENT: Omit<Client, 'id'> = {
  consumerName: '',
  phone: '',
  altPhone: '',
  address: '',
  blockOrTowerType: 'Block',
  blockOrTowerNumber: '',
  flatNumber: '',
  pincode: '',
  amcAmount: 0,
  amcEntryDate: '',
  amcExpiryDate: '',
  unitModel: '',
  installationPlace: '',
  servicingDates: [''],
  paymentMethod: '',
};

const recipeClientFormatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'search'>('add');
  
  // Form State
  const [formData, setFormData] = useState<Omit<Client, 'id'> & { id?: string }>(INITIAL_CLIENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<{show: boolean, type: 'success' | 'error' | 'confirm', message: string, onConfirm?: () => void}>({show: false, type: 'success', message: ''});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [receiptClient, setReceiptClient] = useState<Client | null>(null);

  // Fetch clients
  useEffect(() => {
    const clientsRef = ref(db, 'clients');
    const unsubscribe = onValue(clientsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const clientList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...(value as Omit<Client, 'id'>),
          // Ensure arrays are initialized if missing in old DB records
          servicingDates: (value as any).servicingDates || []
        }));
        setClients(clientList);
      } else {
        setClients([]);
      }
      setLoadingClients(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const getInputClass = (fieldName: string, additional: string = '') => `w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${
    errors[fieldName] 
      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20 text-red-900 placeholder-red-300' 
      : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
  } ${additional}`;

  const handleServicingDateChange = (index: number, value: string) => {
    const newDates = [...formData.servicingDates];
    newDates[index] = value;
    setFormData((prev) => ({ ...prev, servicingDates: newDates }));
  };
  
  const addServicingDate = () => {
    setFormData((prev) => ({ ...prev, servicingDates: [...prev.servicingDates, ''] }));
  };

  const removeServicingDate = (index: number) => {
    const newDates = formData.servicingDates.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, servicingDates: newDates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, boolean> = {};
    if (!formData.consumerName?.trim()) newErrors.consumerName = true;
    if (!formData.phone?.trim()) newErrors.phone = true;
    if (!formData.address?.trim()) newErrors.address = true;
    if (!formData.flatNumber?.trim()) newErrors.flatNumber = true;
    if (!formData.pincode?.trim()) newErrors.pincode = true;
    if (formData.amcAmount === '' || formData.amcAmount === null || formData.amcAmount === undefined) newErrors.amcAmount = true;
    if (!formData.unitModel?.trim()) newErrors.unitModel = true;
    if (!formData.amcEntryDate) newErrors.amcEntryDate = true;
    if (!formData.amcExpiryDate) newErrors.amcExpiryDate = true;
    if (!formData.installationPlace) newErrors.installationPlace = true;
    if (!formData.paymentMethod) newErrors.paymentMethod = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setModal({ show: true, type: 'error', message: 'DATA FILL REQUIRED' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.id) {
        // Update existing
        const clientRef = ref(db, `clients/${formData.id}`);
        const { id, ...updateData } = formData;
        await update(clientRef, updateData);
        setModal({ show: true, type: 'success', message: 'DATA SAVE SUCESSFULLY! Client details updated.'});
      } else {
        // Add new
        const clientsRef = ref(db, 'clients');
        const newClientRef = push(clientsRef);
        await set(newClientRef, formData);
        setModal({ show: true, type: 'success', message: 'DATA SAVE SUCESSFULLY! New client added.' });
        setFormData(INITIAL_CLIENT); // Only reset on new creation
      }
    } catch (error: any) {
      console.error(error);
      setModal({ show: true, type: 'error', message: 'Error saving data. Please check connection and permissions.'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setFormData(client);
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModal({
      show: true,
      type: 'confirm',
      message: 'Are you sure you want to completely remove this client from the database? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const clientRef = ref(db, `clients/${id}`);
          await remove(clientRef);
          setModal({ show: true, type: 'success', message: 'Client record has been completely removed.' });
          if (formData.id === id) {
            setFormData(INITIAL_CLIENT);
          }
        } catch (error) {
          console.error(error);
          setModal({ show: true, type: 'error', message: 'Failed to remove record. Please check connection and permissions.' });
        }
      }
    });
  };

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleViewReceipt = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setReceiptClient(client);
    setShowReceiptModal(true);
  };

  const handleDownloadPDF = async (share: boolean = false) => {
    if (!receiptClient || isDownloadingPdf) return;
    const element = document.getElementById('pdf-receipt-template');
    if (!element) return;
    
    setIsDownloadingPdf(true);
    try {
      const { toPng } = await import('html-to-image');
      const jspdfModule = await import('jspdf');
      const JsPDF = jspdfModule.default || jspdfModule.jsPDF;
      
      const imgData = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      const pdf = new JsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `${receiptClient.consumerName.replace(/\s+/g, '_')}_Receipt.pdf`;
      
      if (share && navigator.canShare) {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Client Receipt',
              text: 'Please find the attached receipt from Elite Enterprise.'
            });
          } catch (shareErr: any) {
            if (shareErr.name !== 'AbortError') {
              console.error('Share failed, downloading instead:', shareErr);
              pdf.save(fileName);
            }
          }
        } else {
          pdf.save(fileName);
        }
      } else {
        pdf.save(fileName);
      }
      
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      setModal({ show: true, type: 'error', message: 'Failed to download receipt: ' + (error?.message || String(error)) });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.consumerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden flex flex-col">
      {modal.show && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center transform transition-all animate-in zoom-in-95 duration-200">
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.type === 'error' ? 'bg-red-100 text-red-600' : modal.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
               {modal.type === 'error' ? <AlertCircle className="w-8 h-8" /> : modal.type === 'confirm' ? <AlertCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">
               {modal.type === 'error' ? 'Action Required' : modal.type === 'confirm' ? 'Confirm Action' : 'Success'}
             </h3>
             <p className="text-slate-600 text-sm mb-6">{modal.message}</p>
             {modal.type === 'confirm' ? (
               <div className="flex gap-3">
                 <button 
                   onClick={() => setModal({ ...modal, show: false })}
                   className="flex-1 py-3 rounded-xl font-bold uppercase tracking-wide transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => {
                     if (modal.onConfirm) modal.onConfirm();
                     setModal({ ...modal, show: false });
                   }}
                   className="flex-1 py-3 rounded-xl font-bold uppercase tracking-wide transition-colors bg-red-600 hover:bg-red-700 text-white"
                 >
                   Remove
                 </button>
               </div>
             ) : (
               <button 
                 onClick={() => setModal({ ...modal, show: false })}
                 className={`w-full py-3 rounded-xl font-bold uppercase tracking-wide transition-colors ${modal.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
               >
                 {modal.type === 'error' ? 'Try Again' : 'Awesome'}
               </button>
             )}
          </div>
        </div>
      )}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
            ELITE <span className="text-indigo-600">ENTERPRISE</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Database Status</p>
            <p className="text-sm font-medium text-emerald-600 flex items-center justify-end gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Firebase Connected
            </p>
          </div>
          {/* Mobile Tab Navigation */}
          <div className="flex lg:hidden space-x-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setActiveTab('add'); if(!formData.id) setFormData(INITIAL_CLIENT); }}
              className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-colors uppercase ${
                activeTab === 'add' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {formData.id ? 'Edit' : 'Add'}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-colors uppercase ${
                activeTab === 'search' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5 mr-1" />
              Search
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden p-4 sm:p-6 gap-6 flex-col lg:flex-row w-full max-w-[1600px] mx-auto">
        {/* Hidden PDF Generation Template (Prevents cropping issues) */}
        {receiptClient && (
          <div className="absolute -left-[9999px] top-0 pointer-events-none opacity-0 overflow-visible">
            <div id="pdf-receipt-template" className="bg-white text-slate-800 p-12 w-[800px] min-h-[1131px] font-sans flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-8 mb-8">
                  <div>
                    <h1 className="text-4xl font-black text-indigo-700 tracking-tight mb-2">ELITE <span className="text-slate-800">ENTERPRISE</span></h1>
                    <p className="text-slate-500 font-medium text-sm">Professional AMC Solutions & Servicing</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-black text-slate-200 uppercase tracking-widest mb-2">INVOICE</h2>
                    <p className="text-sm font-bold text-slate-500">ID: EE-{receiptClient.id?.substring(1, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex justify-between items-stretch mb-10 gap-8">
                  <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase mb-4 tracking-wider">Billed To</p>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">{receiptClient.consumerName}</h3>
                    <p className="text-slate-600 font-medium">{receiptClient.address}</p>
                    <p className="text-slate-600 font-medium">{receiptClient.blockOrTowerType} {receiptClient.blockOrTowerNumber}, Flat No: {receiptClient.flatNumber}</p>
                    <p className="text-slate-600 font-medium mb-3">Pincode: {receiptClient.pincode}</p>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
                      <div>
                        <p className="text-slate-600 font-medium"><span className="text-slate-400">Phone:</span> {receiptClient.phone}</p>
                        {receiptClient.altPhone && <p className="text-slate-600 font-medium"><span className="text-slate-400">Alt:</span> {receiptClient.altPhone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="w-64 bg-indigo-600 text-white p-6 rounded-2xl flex flex-col justify-center">
                    <p className="text-indigo-200 text-xs font-bold uppercase mb-2 tracking-wider">Total Amount</p>
                    <p className="text-4xl font-mono font-bold mb-4">₹ {Number(receiptClient.amcAmount).toLocaleString('en-IN')}</p>
                    <p className="text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg inline-block w-max">
                      {receiptClient.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="mb-10">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-4 tracking-wider">Contract Details</p>
                  <div className="bg-white border rounded-2xl overflow-hidden">
                    <table className="w-full text-left font-sans">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b">
                        <tr>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Unit Model</th>
                          <th className="px-6 py-4">Validity Date</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-medium text-slate-700">
                        <tr>
                          <td className="px-6 py-6 border-b border-slate-100">Annual Maintenance Contract<br/><span className="text-xs text-slate-400 font-normal mt-1 block">Installed at: {receiptClient.installationPlace}</span></td>
                          <td className="px-6 py-6 border-b border-slate-100">{receiptClient.unitModel}</td>
                          <td className="px-6 py-6 border-b border-slate-100">{recipeClientFormatDate(receiptClient.amcEntryDate)} to <br/>{recipeClientFormatDate(receiptClient.amcExpiryDate)}</td>
                          <td className="px-6 py-6 border-b border-slate-100 text-right font-mono font-bold text-base">₹ {Number(receiptClient.amcAmount).toLocaleString('en-IN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {receiptClient.servicingDates && receiptClient.servicingDates.filter(d => Boolean(d)).length > 0 && (
                  <div className="mb-10 border border-slate-200 p-6 rounded-2xl bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Scheduled Servicing Dates</p>
                    <div className="flex flex-wrap gap-3">
                      {receiptClient.servicingDates.filter(d => Boolean(d)).map((date, idx) => (
                        <span key={idx} className="bg-white px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold font-mono text-indigo-600 shadow-sm">
                          {recipeClientFormatDate(date)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto text-center border-t border-slate-100 pt-8 mt-16">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Thank you for your business</p>
                <p className="text-[10px] text-slate-400">If you have any questions concerning this invoice, contact Elite Enterprise support.</p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal for Viewing & PDF Generation */}
        {showReceiptModal && receiptClient && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8">
            <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-full max-w-[850px] w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Client Receipt
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {navigator.canShare && (
                    <button 
                      onClick={() => handleDownloadPDF(true)}
                      disabled={isDownloadingPdf}
                      className={`flex items-center gap-2 px-3 py-2 ${isDownloadingPdf ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'} rounded-lg text-sm font-bold tracking-wide transition-colors`}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleDownloadPDF(false)}
                    disabled={isDownloadingPdf}
                    className={`flex items-center gap-2 px-4 py-2 ${isDownloadingPdf ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg text-sm font-bold tracking-wide transition-colors`}
                  >
                    <Download className={`w-4 h-4 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
                    {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button 
                    onClick={() => { setShowReceiptModal(false); setReceiptClient(null); }}
                    className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto p-4 sm:p-8 bg-slate-200/50 flex justify-center">
                <div id="receipt-template-modal" className="bg-white text-slate-800 p-8 sm:p-12 w-full max-w-[800px] shadow-sm font-sans relative shrink-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-indigo-600 pb-8 mb-8 gap-4 sm:gap-0">
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-black text-indigo-700 tracking-tight mb-2">ELITE <span className="text-slate-800">ENTERPRISE</span></h1>
                      <p className="text-slate-500 font-medium text-sm">Professional AMC Solutions & Servicing</p>
                    </div>
                    <div className="sm:text-right">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-200 uppercase tracking-widest mb-2">INVOICE</h2>
                      <p className="text-sm font-bold text-slate-500">ID: EE-{receiptClient.id?.substring(1, 8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-stretch mb-10 gap-6 sm:gap-8">
                    <div className="flex-1 bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase mb-4 tracking-wider">Billed To</p>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">{receiptClient.consumerName}</h3>
                      <p className="text-sm sm:text-base text-slate-600 font-medium">{receiptClient.address}</p>
                      <p className="text-sm sm:text-base text-slate-600 font-medium">{receiptClient.blockOrTowerType} {receiptClient.blockOrTowerNumber}, Flat No: {receiptClient.flatNumber}</p>
                      <p className="text-sm sm:text-base text-slate-600 font-medium mb-3">Pincode: {receiptClient.pincode}</p>
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm sm:text-base text-slate-600 font-medium"><span className="text-slate-400">Phone:</span> {receiptClient.phone}</p>
                        {receiptClient.altPhone && <p className="text-sm sm:text-base text-slate-600 font-medium"><span className="text-slate-400">Alt:</span> {receiptClient.altPhone}</p>}
                      </div>
                    </div>

                    <div className="w-full md:w-64 bg-indigo-600 text-white p-5 sm:p-6 rounded-2xl flex flex-col justify-center">
                      <p className="text-indigo-200 text-xs font-bold uppercase mb-2 tracking-wider">Total Amount</p>
                      <p className="text-3xl sm:text-4xl font-mono font-bold mb-4">₹ {Number(receiptClient.amcAmount).toLocaleString('en-IN')}</p>
                      <p className="text-xs sm:text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg inline-block w-max">
                        {receiptClient.paymentMethod}
                      </p>
                    </div>
                  </div>

                  <div className="mb-10">
                    <p className="text-xs font-bold text-indigo-600 uppercase mb-4 tracking-wider">Contract Details</p>
                    <div className="bg-white border rounded-2xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left font-sans min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 sm:py-4">Description</th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4">Unit Model</th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4">Validity Date</th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs sm:text-sm font-medium text-slate-700">
                          <tr>
                            <td className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-100">Annual Maintenance Contract<br/><span className="text-[10px] sm:text-xs text-slate-400 font-normal mt-1 block">Installed at: {receiptClient.installationPlace}</span></td>
                            <td className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-100 whitespace-nowrap">{receiptClient.unitModel}</td>
                            <td className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-100 whitespace-nowrap">{recipeClientFormatDate(receiptClient.amcEntryDate)} to <br/>{recipeClientFormatDate(receiptClient.amcExpiryDate)}</td>
                            <td className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-100 text-right font-mono font-bold text-sm sm:text-base whitespace-nowrap">₹ {Number(receiptClient.amcAmount).toLocaleString('en-IN')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {receiptClient.servicingDates && receiptClient.servicingDates.filter(d => Boolean(d)).length > 0 && (
                    <div className="mb-10 border border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Scheduled Servicing Dates</p>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {receiptClient.servicingDates.filter(d => Boolean(d)).map((date, idx) => (
                          <span key={idx} className="bg-white px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold font-mono text-indigo-600 shadow-sm">
                            {recipeClientFormatDate(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-12 sm:mt-16 text-center border-t border-slate-100 pt-6 sm:pt-8">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Thank you for your business</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-400">If you have any questions concerning this invoice, contact Elite Enterprise support.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Left Pane: Client Data Entry */}
        <section className={`w-full lg:w-1/2 flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ${activeTab === 'add' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <h2 className="text-lg font-bold text-slate-700 flex items-center">
              {formData.id ? <Edit2 className="w-5 h-5 mr-2 text-indigo-600" /> : <Plus className="w-5 h-5 mr-2 text-indigo-600" />}
              {formData.id ? 'Update Client Details' : 'Register New Client'}
            </h2>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
              {formData.id ? 'Edit Mode' : 'Form ID: EE-992'}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-6 flex-1 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Consumer Name *</label>
                <input
                  required
                  type="text"
                  name="consumerName"
                  value={formData.consumerName}
                  onChange={handleInputChange}
                  placeholder="e.g. Alexander Pierce"
                  className={getInputClass('consumerName')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Primary Phone *</label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 00000 00000"
                  className={getInputClass('phone')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 underline decoration-indigo-300">Secondary (Optional)</label>
                <input
                  type="tel"
                  name="altPhone"
                  value={formData.altPhone}
                  onChange={handleInputChange}
                  placeholder="Alternative number"
                  className={getInputClass('altPhone')}
                />
              </div>

              <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-3 text-center sm:text-left">Location & Address Details</label>
                <div className="mb-2">
                  <input
                    required
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street address, neighborhood *"
                    className={getInputClass('address')}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Type</label>
                    <select
                      name="blockOrTowerType"
                      value={formData.blockOrTowerType}
                      onChange={handleInputChange}
                      className={getInputClass('blockOrTowerType', 'bg-white px-2 py-2 text-xs')}
                    >
                      <option value="Block">BLOCK</option>
                      <option value="Tower">TOWER</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Number</label>
                    <input
                      type="text"
                      name="blockOrTowerNumber"
                      value={formData.blockOrTowerNumber}
                      onChange={handleInputChange}
                      placeholder="No."
                      className={getInputClass('blockOrTowerNumber')}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Flat No *</label>
                    <input
                      required
                      type="text"
                      name="flatNumber"
                      value={formData.flatNumber}
                      onChange={handleInputChange}
                      placeholder="FLAT NO.-......"
                      className={getInputClass('flatNumber')}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pincode *</label>
                    <input
                      required
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="Pincode"
                      className={getInputClass('pincode')}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">AMC Amount (₹) *</label>
                <input
                  required
                  type="number"
                  name="amcAmount"
                  value={formData.amcAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  className={getInputClass('amcAmount')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Model *</label>
                <input
                  required
                  type="text"
                  name="unitModel"
                  value={formData.unitModel}
                  onChange={handleInputChange}
                  placeholder="Model identifier"
                  className={getInputClass('unitModel')}
                />
              </div>

              <div className="col-span-2 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">AMC Start Date *</label>
                  <input
                    required
                    type="date"
                    name="amcEntryDate"
                    value={formData.amcEntryDate}
                    onChange={handleInputChange}
                    className={getInputClass('amcEntryDate', 'text-slate-600')}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">AMC Expiry Date *</label>
                  <input
                    required
                    type="date"
                    name="amcExpiryDate"
                    value={formData.amcExpiryDate}
                    onChange={handleInputChange}
                    className={getInputClass('amcExpiryDate', 'text-slate-600')}
                  />
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Installation Place *</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, installationPlace: 'Home' }))}
                        className={`flex-1 py-2 text-xs rounded-lg font-bold uppercase transition-colors border ${
                          formData.installationPlace === 'Home' 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        Home
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, installationPlace: 'Office' }))}
                        className={`flex-1 py-2 text-xs rounded-lg font-bold uppercase transition-colors border ${
                          formData.installationPlace === 'Office' 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        Office
                      </button>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method *</label>
                    <select
                      required
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      className={getInputClass('paymentMethod', 'bg-white')}
                    >
                      <option value="" disabled>Select Method</option>
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                      <option value="Check">Check</option>
                    </select>
                 </div>
              </div>

              {/* Servicing Dates */}
              <div className="col-span-2 pt-4 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Servicing Schedule</label>
                  <button
                    type="button"
                    onClick={addServicingDate}
                    className="flex items-center text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase"
                  >
                    <CalendarPlus className="w-3 h-3 mr-1" /> Add Entry
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.servicingDates.map((date, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => handleServicingDateChange(index, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                        />
                      </div>
                      {formData.servicingDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeServicingDate(index)}
                          className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 uppercase tracking-wide"
              >
                {isSubmitting ? 'Processing...' : formData.id ? 'Update Record' : 'Save To Firebase'}
              </button>
              {formData.id && (
                <button
                  type="button"
                  onClick={() => setFormData(INITIAL_CLIENT)}
                  className="w-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                  title="Cancel Edit"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Right Pane: Database Search & View */}
        <section className={`w-full lg:w-1/2 flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ${activeTab === 'search' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Search Bar Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search consumer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white shadow-sm border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 flex justify-between items-center border-b border-slate-100 shrink-0">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Recent Entries</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{filteredClients.length} Records Found</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-px">
              {loadingClients ? (
                <div className="flex justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 border-solid"></div>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm font-medium">
                  No records found matching your search.
                </div>
              ) : (
                filteredClients.map((client) => {
                  // Get initials to color code them based on name length
                  const initials = client.consumerName.substring(0, 2).toUpperCase();
                  const colorIndex = client.consumerName.length % 5;
                  const avatarColors = [
                    'bg-blue-100 text-blue-700',
                    'bg-indigo-100 text-indigo-700',
                    'bg-amber-100 text-amber-700',
                    'bg-emerald-100 text-emerald-700',
                    'bg-rose-100 text-rose-700'
                  ];
                  const avatarColor = avatarColors[colorIndex];

                  return (
                    <div key={client.id} id={`client-card-${client.id}`} className="group p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer bg-white relative">
                      <div className="flex gap-4 items-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${avatarColor} shrink-0`}>
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 leading-tight">{client.consumerName}</h3>
                          <p className="text-xs font-mono text-slate-500 mt-0.5">{client.phone} {client.altPhone && `• ${client.altPhone}`}</p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium line-clamp-1">
                            {client.blockOrTowerType} {client.blockOrTowerNumber}, Flat {client.flatNumber} • Pin: {client.pincode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-indigo-600 font-mono">₹ {client.amcAmount.toLocaleString('en-IN')}</div>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                          {client.installationPlace || 'Unknown'} / {client.unitModel}
                        </span>
                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-3 card-actions">
                          <button 
                            onClick={(e) => handleViewReceipt(client, e)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="View Receipt"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(client.id as string, e)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove completely"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Summary Footer */}
          <div className="p-4 bg-slate-900 justify-between items-center shrink-0 hidden sm:flex">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">Total Value</p>
                <p className="text-sm font-bold text-white font-mono">
                   ₹ {filteredClients.reduce((sum, c) => sum + Number(c.amcAmount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
             <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Stored in Firebase
             </p>
          </div>
        </section>
      </main>
    </div>
  );
}

