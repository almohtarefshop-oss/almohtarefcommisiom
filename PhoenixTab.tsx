import React, { useState, useMemo } from 'react';
import { Upload, FileSpreadsheet, Save, LayoutList, RefreshCw, AlertCircle, ChevronDown, ChevronRight, ClipboardPaste, XCircle, AlertTriangle, FileWarning, Wallet, ArrowDownLeft, ArrowUpRight, Smartphone, Users, Eye, EyeOff, CheckCircle2, Trash2 } from 'lucide-react';
import useXLSX from './hooks/useXLSX';
import SortableTable from './components/SortableTable';
import ReconcileTable from './components/ReconcileTable';
import { generateId, normalizeIndicDigits, checkCommissionStatus, matchWalletLists, parseAndCleanInput } from './utils';

export default function PhoenixTab() {
  const isXlsxReady = useXLSX();
  
  // State
  const [isMadfooatComOpen, setIsMadfooatComOpen] = useState(true);
  const [processedData, setProcessedData] = useState<any>(null); 
  const [baseData, setBaseData] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [phoenixInput, setPhoenixInput] = useState("");
  const [isMatched, setIsMatched] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'رقم الدفعة', direction: 'ascending' });
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [showExtraInfo, setShowExtraInfo] = useState(true);

  // Filter States
  const [madfooatFilter, setMadfooatFilter] = useState<'all' | 'valid' | 'issues'>('all');
  const [profFilter, setProfFilter] = useState<'all' | 'valid' | 'issues'>('all');
  const [orangeFilter, setOrangeFilter] = useState<'all' | 'valid' | 'issues'>('all');
  const [zainFilter, setZainFilter] = useState<'all' | 'valid' | 'issues'>('all');

  const [isOrangeSectionOpen, setIsOrangeSectionOpen] = useState(false);
  const [orangeAgentInput, setOrangeAgentInput] = useState("");
  const [orangePhxDepInput, setOrangePhxDepInput] = useState("");
  const [orangePhxWithInput, setOrangePhxWithInput] = useState("");
  const [orangeResult, setOrangeResult] = useState<any>(null);

  const [isZainSectionOpen, setIsZainSectionOpen] = useState(false);
  const [zainFileName, setZainFileName] = useState("");
  const [zainAgentData, setZainAgentData] = useState<any>(null); 
  const [zainPhxDepInput, setZainPhxDepInput] = useState("");
  const [zainPhxWithInput, setZainPhxWithInput] = useState("");
  const [zainResult, setZainResult] = useState<any>(null);

  const [isProfSectionOpen, setIsProfSectionOpen] = useState(false);
  const [profPhoenixInput, setProfPhoenixInput] = useState("");
  const [isProfMatched, setIsProfMatched] = useState(false);
  const [profSortConfig, setProfSortConfig] = useState({ key: 'رقم الدفعة', direction: 'ascending' });
  const [isProfAnalysisOpen, setIsProfAnalysisOpen] = useState(false);

  // --- Handlers ---
  const handleMadfooatEdit = (id: string, newVal: any) => {
    const normalizedVal = normalizeIndicDigits(newVal);
    const newData = { ...processedData };
    const row = newData.main.find((r: any) => r.id === id);
    if (!row) return;
    
    row["فينيكس"] = normalizedVal;
    
    const net = parseFloat(row["صافي المبلغ"]) || 0;
    const phx = parseFloat(normalizedVal);
    
    if (!isNaN(phx) && net > 0) {
      row["العمولة"] = (phx - net).toFixed(3);
    } else {
      row["العمولة"] = "";
    }
    setProcessedData(newData);
  };

  const handleProfEdit = (id: string, newVal: any) => {
    const normalizedVal = normalizeIndicDigits(newVal);
    const newData = { ...processedData };
    const row = newData.separated.find((r: any) => r.id === id);
    if (!row) return;

    row["فينيكس"] = normalizedVal;
    const net = parseFloat(row["صافي المبلغ"]) || 0;
    const phx = parseFloat(normalizedVal);
    if (!isNaN(phx) && net > 0) {
      row["العمولة"] = (phx - net).toFixed(3);
    } else {
      row["العمولة"] = "";
    }
    setProcessedData(newData);
  };

  const handleWalletEdit = (provider: string, type: 'withdrawal' | 'deposit', id: string, newVal: any) => {
    const normalizedVal = normalizeIndicDigits(newVal);
    const resultState = provider === 'orange' ? orangeResult : zainResult;
    const setResult = provider === 'orange' ? setOrangeResult : setZainResult;
    
    const listKey = type === 'withdrawal' ? 'withdrawals' : 'deposits';
    const newList = resultState[listKey].map((row: any) => {
      if (row.id === id) {
        return { ...row, phoenix: normalizedVal };
      }
      return row;
    });
    
    setResult({ ...resultState, [listKey]: newList });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name.replace(/\.[^/.]+$/, ""));
    setError(""); setIsMatched(false); setIsProfMatched(false);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = (window as any).XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = (window as any).XLSX.utils.sheet_to_json(ws);
        const normalizedData = rawData.map((row: any) => {
          const newRow: any = {};
          Object.keys(row).forEach(key => { if (key && typeof key === 'string') newRow[key.trim()] = row[key]; });
          return newRow;
        });
        processData(normalizedData);
      } catch (err) { setError("حدث خطأ أثناء قراءة الملف."); console.error(err); }
    };
    reader.readAsArrayBuffer(file);
  };

  const processData = (data: any[]) => {
    if (!data || data.length === 0) return;
    const mainOps: any[] = []; const profOps: any[] = []; 
    data.forEach(row => {
      const rowValues = Object.values(row).map(String);
      if (rowValues.some(val => val.includes("عدد السجلات"))) return;
      const branchVal = String(row["اسم الفرع"] || row["إسم الفرع"] || "-").trim();
      let netAmount = parseFloat(row["صافي المبلغ"]);
      if (isNaN(netAmount)) netAmount = 0;
      
      const newRow = { 
        id: generateId(), 
        "رقم الدفعة": row["رقم الدفعة"] || "", 
        "اسم المفوتر": row["اسم المفوتر"] || row["إسم المفوتر"] || "", 
        "معلومات اضافية": row["معلومات اضافية"] || row["معلومات إضافية"] || "", 
        "وقت العملية": row["وقت العملية"] || "", 
        "صافي المبلغ": netAmount, 
        "فينيكس": "", 
        "العمولة": "", 
        "isExtra": false 
      };
      
      if (branchVal.includes("المحترف 1") || branchVal.includes("المحترف ١")) profOps.push(newRow); else mainOps.push(newRow);
    });
    const sorter = (a: any, b: any) => (parseFloat(String(a["رقم الدفعة"]).replace(/[^0-9.-]+/g,"")) || 0) - (parseFloat(String(b["رقم الدفعة"]).replace(/[^0-9.-]+/g,"")) || 0);
    mainOps.sort(sorter); profOps.sort(sorter);
    const initialData = { main: mainOps, separated: profOps };
    setProcessedData(initialData);
    setBaseData(JSON.parse(JSON.stringify(initialData))); 
  };

  const handlePhoenixMatching = () => {
    if (!baseData) return; 
    let pValues = parseAndCleanInput(phoenixInput).map((val, index) => ({ value: val, originalIndex: index, used: false }));
    let pValuesForSearch = [...pValues].sort((a, b) => a.value - b.value);
    const newMainData = JSON.parse(JSON.stringify(baseData.main));
    newMainData.forEach((row: any) => {
      const net = row["صافي المبلغ"];
      if (net <= 0) return;
      let expected = net < 100 ? 0.25 : (Math.floor(net / 100) * 0.5) + 0.25;
      const target = net + expected;
      let bestIdx = -1, minDiff = Number.MAX_VALUE;
      for (let i = 0; i < pValuesForSearch.length; i++) {
        const item = pValuesForSearch[i];
        if (item.used) continue;
        if (item.value < net - 0.05) continue; 
        if (item.value > target + 5) break; 
        const diff = Math.abs(item.value - target);
        if (diff < minDiff) { minDiff = diff; bestIdx = i; }
      }
      if (bestIdx !== -1) {
        const mItem = pValuesForSearch[bestIdx];
        row["فينيكس"] = mItem.value;
        row["العمولة"] = (mItem.value - net).toFixed(3);
        mItem.used = true;
      }
    });
    const extraRows = pValues.filter(p => !p.used).map(p => ({ 
        id: generateId(),
        "رقم الدفعة": "-", "اسم المفوتر": "قيمة فينيكس إضافية", "معلومات اضافية": "-", "وقت العملية": "-", 
        "صافي المبلغ": "-", 
        "فينيكس": p.value, "العمولة": p.value.toFixed(3), "isExtra": true 
    }));
    setProcessedData((prev: any) => ({ ...prev, main: [...newMainData, ...extraRows] }));
    setIsMatched(true);
  };

  const handleProfPhoenixMatching = () => {
    if (!baseData) return; 
    let pValues = parseAndCleanInput(profPhoenixInput).map((val, index) => ({ value: val, originalIndex: index, used: false }));
    let pValuesForSearch = [...pValues].sort((a, b) => a.value - b.value);
    const newProfData = JSON.parse(JSON.stringify(baseData.separated));
    newProfData.forEach((row: any) => {
      const net = row["صافي المبلغ"];
      if (net <= 0) return;
      let expected = net < 100 ? 0.25 : (Math.floor(net / 100) * 0.5) + 0.25;
      const target = net + expected;
      let bestIdx = -1, minDiff = Number.MAX_VALUE;
      for (let i = 0; i < pValuesForSearch.length; i++) {
        const item = pValuesForSearch[i];
        if (item.used) continue;
        if (item.value < net - 0.05) continue; 
        if (item.value > target + 5) break; 
        const diff = Math.abs(item.value - target);
        if (diff < minDiff) { minDiff = diff; bestIdx = i; }
      }
      if (bestIdx !== -1) {
        const mItem = pValuesForSearch[bestIdx];
        row["فينيكس"] = mItem.value;
        row["العمولة"] = (mItem.value - net).toFixed(3);
        mItem.used = true;
      }
    });
    const extraRows = pValues.filter(p => !p.used).map(p => ({ 
        id: generateId(),
        "رقم الدفعة": "-", "اسم المفوتر": "قيمة فينيكس إضافية", "معلومات اضافية": "-", "وقت العملية": "-", 
        "صافي المبلغ": "-",
        "فينيكس": p.value, "العمولة": p.value.toFixed(3), "isExtra": true 
    }));
    setProcessedData((prev: any) => ({ ...prev, separated: [...newProfData, ...extraRows] }));
    setIsProfMatched(true);
  };

  const handleOrangeMatching = () => {
    const agentRaw = parseAndCleanInput(orangeAgentInput);
    const agentWithdrawals = agentRaw.filter(n => n > 0);
    const agentDeposits = agentRaw.filter(n => n < 0).map(n => Math.abs(n));
    const phxWithdrawals = parseAndCleanInput(orangePhxWithInput);
    const phxDeposits = parseAndCleanInput(orangePhxDepInput, true); 
    setOrangeResult({ withdrawals: matchWalletLists(agentWithdrawals, phxWithdrawals, 'withdrawal'), deposits: matchWalletLists(agentDeposits, phxDeposits, 'deposit') });
  };

  const handleZainFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZainFileName(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = (window as any).XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = (window as any).XLSX.utils.sheet_to_json(ws);
        const withdrawals: any[] = [];
        const deposits: any[] = [];
        rawData.forEach((row: any) => {
          const rowNormalized: any = {};
          Object.keys(row).forEach(k => rowNormalized[k.trim().toLowerCase()] = row[k]);
          const status = String(rowNormalized['status'] || "").trim();
          if (status.toLowerCase() !== 'success') return;
          const amount = parseFloat(rowNormalized['total amount']);
          const date = rowNormalized['date'] || "-";
          if (isNaN(amount)) return;
          const item = { amount: Math.abs(amount), date, status };
          if (amount > 0) withdrawals.push(item); else if (amount < 0) deposits.push(item);
        });
        setZainAgentData({ withdrawals, deposits });
      } catch (err) { console.error(err); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleZainMatching = () => {
    if (!zainAgentData) return;
    const phxWithdrawals = parseAndCleanInput(zainPhxWithInput);
    const phxDeposits = parseAndCleanInput(zainPhxDepInput, true);
    setZainResult({ withdrawals: matchWalletLists(zainAgentData.withdrawals, phxWithdrawals, 'withdrawal'), deposits: matchWalletLists(zainAgentData.deposits, phxDeposits, 'deposit') });
  };

  const sortedMainData = useMemo(() => {
    if (!processedData?.main) return [];
    let items = [...processedData.main];
    if (sortConfig.key) {
      items.sort((a, b) => {
        let valA = a[sortConfig.key], valB = b[sortConfig.key];
        if (["صافي المبلغ", "رقم الدفعة", "فينيكس", "العمولة"].includes(sortConfig.key)) {
           valA = parseFloat(String(valA).replace(/[^0-9.-]+/g,"")) || 0;
           valB = parseFloat(String(valB).replace(/[^0-9.-]+/g,"")) || 0;
        }
        return sortConfig.direction === 'ascending' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
      });
    }
    return items;
  }, [processedData, sortConfig]);

  const sortedProfData = useMemo(() => {
    if (!processedData?.separated) return [];
    let items = [...processedData.separated];
    // reusing profSortConfig logic...
    if (profSortConfig.key) {
        items.sort((a, b) => {
          let valA = a[profSortConfig.key], valB = b[profSortConfig.key];
          if (["صافي المبلغ", "رقم الدفعة", "فينيكس", "العمولة"].includes(profSortConfig.key)) {
             valA = parseFloat(String(valA).replace(/[^0-9.-]+/g,"")) || 0;
             valB = parseFloat(String(valB).replace(/[^0-9.-]+/g,"")) || 0;
          }
          return profSortConfig.direction === 'ascending' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
        });
    }
    return items; 
  }, [processedData, profSortConfig]);

  const analysis = useMemo(() => {
    if (!processedData?.main) return null;
    let missing = 0, extra = 0, mismatch = 0;
    processedData.main.forEach((row: any) => {
      const s = checkCommissionStatus(row);
      if (s === 'missing' && row["صافي المبلغ"] !== "-") missing++;
      if (s === 'extra') extra++;
      if (s === 'invalid') mismatch++;
    });
    return { missing, extra, mismatch, hasErrors: missing > 0 || extra > 0 || mismatch > 0 };
  }, [processedData]);

  const profAnalysis = useMemo(() => {
    if (!processedData?.separated) return null;
    let missing = 0, extra = 0, mismatch = 0;
    processedData.separated.forEach((row: any) => {
      const s = checkCommissionStatus(row);
      if (s === 'missing' && row["صافي المبلغ"] !== "-") missing++;
      if (s === 'extra') extra++;
      if (s === 'invalid') mismatch++;
    });
    return { missing, extra, mismatch, hasErrors: missing > 0 || extra > 0 || mismatch > 0 };
  }, [processedData]);

  const requestSort = (key: string) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
  const requestProfSort = (key: string) => setProfSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));

  const exportToExcel = () => {
    const wb = (window as any).XLSX.utils.book_new();
    const ws = (window as any).XLSX.utils.json_to_sheet([]);

    ws['!views'] = [{ rightToLeft: true }];

    // --- 1. MadfooatCom (Cols A-G) ---
    if (processedData) {
      // Re-order data for export: Move "معلومات اضافية" to end
      const data1 = sortedMainData.map(row => ({
        "رقم الدفعة": row["رقم الدفعة"],
        "اسم المفوتر": row["اسم المفوتر"],
        "وقت العملية": row["وقت العملية"],
        "صافي المبلغ": row["صافي المبلغ"] === "-" ? "" : (parseFloat(row["صافي المبلغ"]) || 0),
        "فينيكس": parseFloat(row["فينيكس"]) || 0,
        "العمولة": "", // Formula
        "معلومات اضافية": row["معلومات اضافية"] // Moved to end
      }));
      (window as any).XLSX.utils.sheet_add_aoa(ws, [["تقرير مدفوعاتكم"]], { origin: "A1" });
      (window as any).XLSX.utils.sheet_add_json(ws, data1, { origin: "A2" });

      const startRow = 3; 
      data1.forEach((row, i) => {
        const r = startRow + i;
        // Col F (index 5) is Commission. F = E - D
        if (row["صافي المبلغ"] !== "") { 
            const cellRef = (window as any).XLSX.utils.encode_cell({c: 5, r: r - 1}); 
            ws[cellRef] = { t: 'n', f: `E${r}-D${r}` };
        }
        
        // Attempt White Font for Col G (index 6) - "معلومات اضافية"
        // Note: SheetJS Community Edition often ignores 's' object for styling.
        const extraInfoRef = (window as any).XLSX.utils.encode_cell({c: 6, r: r - 1});
        if(ws[extraInfoRef]) {
            ws[extraInfoRef].s = { font: { color: { rgb: "FFFFFF" } } };
        }
      });
    }

    // --- 2. Orange Money (Cols M-P) ---
    if (orangeResult) {
      const data2: any[] = [];
      const rows: any[] = [];
      orangeResult.withdrawals.forEach((r: any) => rows.push({ type: "سحب", ...r }));
      orangeResult.deposits.forEach((r: any) => rows.push({ type: "إيداع", ...r }));
      rows.forEach(r => {
        data2.push({
          "النوع": r.type,
          "الوكيل": parseFloat(r.agent) || 0,
          "فينيكس": parseFloat(r.phoenix) || 0,
          "العمولة": ""
        });
      });
      (window as any).XLSX.utils.sheet_add_aoa(ws, [["تقرير Orange Money"]], { origin: { r: 0, c: 12 } });
      (window as any).XLSX.utils.sheet_add_json(ws, data2, { origin: { r: 1, c: 12 } });
      const startRow = 3; 
      data2.forEach((_, i) => {
        const r = startRow + i;
        const cellRef = (window as any).XLSX.utils.encode_cell({c: 15, r: r - 1}); 
        ws[cellRef] = { t: 'n', f: `O${r}-N${r}` };
      });
    }

    // --- 3. Zain Cash (Cols V-AA) ---
    if (zainResult) {
      const data3: any[] = [];
      const rows: any[] = [];
      zainResult.withdrawals.forEach((r: any) => rows.push({ type: "سحب", ...r }));
      zainResult.deposits.forEach((r: any) => rows.push({ type: "إيداع", ...r }));
      rows.forEach(r => {
        data3.push({
          "النوع": r.type,
          "التاريخ": r.details?.date,
          "الحالة": r.details?.status,
          "الوكيل": parseFloat(r.agent) || 0,
          "فينيكس": parseFloat(r.phoenix) || 0,
          "العمولة": ""
        });
      });
      (window as any).XLSX.utils.sheet_add_aoa(ws, [["تقرير Zain Cash"]], { origin: { r: 0, c: 21 } });
      (window as any).XLSX.utils.sheet_add_json(ws, data3, { origin: { r: 1, c: 21 } });
      const startRow = 3;
      data3.forEach((_, i) => {
        const r = startRow + i;
        const cellRef = (window as any).XLSX.utils.encode_cell({c: 26, r: r - 1}); 
        ws[cellRef] = { t: 'n', f: `Z${r}-Y${r}` };
      });
    }

    // --- 4. Prof (Cols AG-AM) ---
    if (sortedProfData && sortedProfData.length > 0) {
      const data4 = sortedProfData.map(row => ({
        "رقم الدفعة": row["رقم الدفعة"],
        "اسم المفوتر": row["اسم المفوتر"],
        "وقت العملية": row["وقت العملية"],
        "صافي المبلغ": row["صافي المبلغ"] === "-" ? "" : (parseFloat(row["صافي المبلغ"]) || 0),
        "فينيكس": parseFloat(row["فينيكس"]) || 0,
        "العمولة": "",
        "معلومات اضافية": row["معلومات اضافية"] // Moved to end
      }));
      (window as any).XLSX.utils.sheet_add_aoa(ws, [["عمليات المحترف 2 و 3"]], { origin: { r: 0, c: 32 } });
      (window as any).XLSX.utils.sheet_add_json(ws, data4, { origin: { r: 1, c: 32 } });
      const startRow = 3; 
      data4.forEach((row, i) => {
        const r = startRow + i;
        if (row["صافي المبلغ"] !== "") {
            const cellRef = (window as any).XLSX.utils.encode_cell({c: 37, r: r - 1}); 
            ws[cellRef] = { t: 'n', f: `AH${r}-AG${r}` };
        }
        // White font for "Extra Info" (Col AM -> Index 38)
        const extraInfoRef = (window as any).XLSX.utils.encode_cell({c: 38, r: r - 1});
        if(ws[extraInfoRef]) {
            ws[extraInfoRef].s = { font: { color: { rgb: "FFFFFF" } } };
        }
      });
    }

    const wscols = [
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, // A-G (G is Extra)
        { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, 
        { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, 
        { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, 
        { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, 
        { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, 
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 } // AG-AM
    ];
    ws['!cols'] = wscols;

    (window as any).XLSX.utils.book_append_sheet(wb, ws, "التقرير الشامل");
    (window as any).XLSX.writeFile(wb, `${fileName}_Comprehensive.xlsx`);
  };

  const FilterButtons = ({ filter, setFilter }: { filter: string, setFilter: (f: 'all' | 'valid' | 'issues') => void }) => (
    <div className="flex bg-slate-100 p-1 rounded-lg">
      <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>الكل</button>
      <button onClick={() => setFilter('issues')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${filter === 'issues' ? 'bg-red-50 text-red-600 shadow' : 'text-slate-500 hover:text-red-500'}`}><AlertTriangle size={12}/> مشاكل فقط</button>
      <button onClick={() => setFilter('valid')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${filter === 'valid' ? 'bg-emerald-50 text-emerald-600 shadow' : 'text-slate-500 hover:text-emerald-500'}`}><CheckCircle2 size={12}/> متطابق</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans tab-content active" dir="rtl">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-right">
          <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3"><FileSpreadsheet className="w-10 h-10 text-blue-600" /> نظام المطابقة الشامل</h1>
          <p className="text-slate-500 text-sm">مدفوعاتكم | Orange Money | Zain Cash | المحترف</p>
        </div>
        {(processedData || orangeResult || zainResult) && (
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg font-bold text-lg transition transform hover:scale-105"><Save size={20} /> تصدير ملف Excel الشامل</button>
        )}
      </header>

      <main className="max-w-[98%] mx-auto space-y-8">
        
        {/* Section 1: MadfooatCom */}
        <section className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
          <button onClick={() => setIsMadfooatComOpen(!isMadfooatComOpen)} className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors">
            <div className="flex items-center gap-3"><span className="bg-blue-600 text-white px-3 py-1 rounded-md font-bold text-sm">القسم 1</span><h2 className="text-xl font-bold text-slate-700">مدفوعاتكم (فواتير)</h2></div>
            {isMadfooatComOpen ? <ChevronDown size={24} className="text-blue-600"/> : <ChevronRight size={24} className="text-blue-600"/>}
          </button>
          {isMadfooatComOpen && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 flex flex-col items-center justify-center text-center h-52">
                  {!isXlsxReady ? <div className="flex items-center gap-2 text-amber-600"><RefreshCw className="animate-spin" size={20} /> تحميل...</div> : 
                    <div className="w-full max-w-xs space-y-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto"><Upload size={24} /></div>
                      <h3 className="font-bold text-slate-700">ملف مدفوعاتكم (Excel)</h3>
                      <label className="block w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-center shadow">اختيار ملف<input type="file" accept=".xlsx, .csv" onChange={handleFileUpload} className="hidden" /></label>
                      {fileName && <div className="text-xs text-emerald-600 font-medium truncate bg-emerald-50 py-1 px-2 rounded">{fileName}</div>}
                    </div>
                  }
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-52">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-slate-700 flex gap-2"><ClipboardPaste size={18} className="text-purple-600"/> قيم فينيكس (اختياري)</h3>
                    {phoenixInput && <button onClick={() => setPhoenixInput('')} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={12}/> مسح</button>}
                  </div>
                  <textarea dir="ltr" className="text-left flex-1 w-full p-2 bg-slate-50 border rounded-lg text-sm font-mono resize-none focus:outline-purple-400" placeholder="Paste Phoenix numbers here..." value={phoenixInput} onChange={(e) => setPhoenixInput(e.target.value)} />
                  <button onClick={handlePhoenixMatching} disabled={!processedData} className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50">{isMatched ? "تحديث المطابقة" : "تشغيل المطابقة"}</button>
                </div>
              </div>
              {processedData && (
                <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-3 bg-slate-50 border-b flex justify-between items-center sticky top-0 z-20 gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-700 flex gap-2"><LayoutList size={20}/> النتائج</h3>
                    <div className="flex items-center gap-3">
                      <FilterButtons filter={madfooatFilter} setFilter={setMadfooatFilter} />
                      <div className="w-px h-6 bg-slate-300 mx-1"></div>
                      <button 
                        onClick={() => setShowExtraInfo(!showExtraInfo)}
                        className={`p-1.5 rounded-full transition-colors ${showExtraInfo ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                        title={showExtraInfo ? "إخفاء المعلومات الإضافية" : "إظهار المعلومات الإضافية"}
                      >
                        {showExtraInfo ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <SortableTable 
                      data={sortedMainData} 
                      sortConfig={sortConfig} 
                      requestSort={requestSort} 
                      onEdit={handleMadfooatEdit} 
                      rawPhoenixInput={phoenixInput} 
                      showExtraInfo={showExtraInfo} 
                      filter={madfooatFilter}
                    />
                  </div>
                  {analysis && analysis.hasErrors && (
                    <div className="border-t">
                      <button onClick={() => setIsAnalysisOpen(!isAnalysisOpen)} className="w-full flex justify-between p-3 bg-red-50 text-red-700 font-bold text-sm">
                        <div className="flex items-center gap-2"><FileWarning size={18}/> تنبيهات المطابقة ({analysis.missing + analysis.extra + analysis.mismatch})</div>
                        {isAnalysisOpen ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                      </button>
                      {isAnalysisOpen && (
                        <div className="p-4 space-y-2 bg-white">
                          {analysis.missing > 0 && <div className="text-xs text-red-600 flex gap-2"><XCircle size={14}/> {analysis.missing} عملية مفقودة في فينيكس</div>}
                          {analysis.extra > 0 && <div className="text-xs text-red-600 flex gap-2"><XCircle size={14}/> {analysis.extra} عملية زائدة في فينيكس</div>}
                          {analysis.mismatch > 0 && <div className="text-xs text-orange-600 flex gap-2"><AlertTriangle size={14}/> {analysis.mismatch} فروقات في العمولة</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 2: Orange */}
        <div className="border-t-2 border-dashed border-slate-300 my-8"></div>
        <section className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
          <button onClick={() => setIsOrangeSectionOpen(!isOrangeSectionOpen)} className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 transition-colors">
            <div className="flex items-center gap-3"><span className="bg-orange-500 text-white px-3 py-1 rounded-md font-bold text-sm">القسم 2</span><h2 className="text-xl font-bold text-slate-700">Orange Money (أورانج موني)</h2></div>
            {isOrangeSectionOpen ? <ChevronDown size={24} className="text-orange-600"/> : <ChevronRight size={24} className="text-orange-600"/>}
          </button>
          {isOrangeSectionOpen && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4 flex flex-col h-64">
                   <div className="flex items-center justify-between mb-2 text-slate-700 font-bold border-b pb-2">
                     <span className="flex items-center gap-2"><Wallet size={18} className="text-orange-500"/> 1. كشف الوكيل</span>
                     {orangeAgentInput && <button onClick={() => setOrangeAgentInput('')}><Trash2 size={14} className="text-slate-400 hover:text-red-500"/></button>}
                   </div>
                   <textarea dir="ltr" className="text-left flex-1 w-full p-2 bg-orange-50/30 border rounded-lg text-sm font-mono resize-none focus:outline-orange-400" placeholder="Paste agent list..." value={orangeAgentInput} onChange={(e) => setOrangeAgentInput(e.target.value)} />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-64">
                   <div className="flex items-center justify-between mb-2 text-slate-700 font-bold border-b pb-2">
                     <span className="flex items-center gap-2"><ArrowDownLeft size={18} className="text-emerald-500"/> 2. فينيكس (إيداع)</span>
                     {orangePhxDepInput && <button onClick={() => setOrangePhxDepInput('')}><Trash2 size={14} className="text-slate-400 hover:text-red-500"/></button>}
                   </div>
                   <textarea dir="ltr" className="text-left flex-1 w-full p-2 bg-slate-50 border rounded-lg text-sm font-mono resize-none focus:outline-emerald-400" placeholder="Phoenix Deposits..." value={orangePhxDepInput} onChange={(e) => setOrangePhxDepInput(e.target.value)} />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-64">
                   <div className="flex items-center justify-between mb-2 text-slate-700 font-bold border-b pb-2">
                     <span className="flex items-center gap-2"><ArrowUpRight size={18} className="text-red-500"/> 3. فينيكس (سحب)</span>
                     {orangePhxWithInput && <button onClick={() => setOrangePhxWithInput('')}><Trash2 size={14} className="text-slate-400 hover:text-red-500"/></button>}
                   </div>
                   <textarea dir="ltr" className="text-left flex-1 w-full p-2 bg-slate-50 border rounded-lg text-sm font-mono resize-none focus:outline-red-400" placeholder="Phoenix Withdrawals..." value={orangePhxWithInput} onChange={(e) => setOrangePhxWithInput(e.target.value)} />
                </div>
              </div>
              <button onClick={handleOrangeMatching} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-[1.005]">مطابقة Orange Money</button>
              {orangeResult && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white rounded-xl shadow border border-red-100 overflow-hidden flex flex-col">
                    <div className="p-3 bg-red-50 border-b border-red-100 font-bold text-red-800 flex justify-between items-center">
                      <span>عمليات السحب (Withdrawals) <span className="bg-white px-2 rounded-full text-xs border border-red-200 ms-2">{orangeResult.withdrawals.length}</span></span>
                      <FilterButtons filter={orangeFilter} setFilter={setOrangeFilter} />
                    </div>
                    <div className="overflow-x-auto"><ReconcileTable data={orangeResult.withdrawals} type="withdrawal" onEdit={(id, val) => handleWalletEdit('orange', 'withdrawal', id, val)} rawPoolInput={orangePhxWithInput} filter={orangeFilter} /></div>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-emerald-100 overflow-hidden flex flex-col">
                    <div className="p-3 bg-emerald-50 border-b border-emerald-100 font-bold text-emerald-800 flex justify-between items-center">
                       <span>عمليات الإيداع (Deposits) <span className="bg-white px-2 rounded-full text-xs border border-emerald-200 ms-2">{orangeResult.deposits.length}</span></span>
                       <FilterButtons filter={orangeFilter} setFilter={setOrangeFilter} />
                    </div>
                    <div className="overflow-x-auto"><ReconcileTable data={orangeResult.deposits} type="deposit" onEdit={(id, val) => handleWalletEdit('orange', 'deposit', id, val)} rawPoolInput={orangePhxDepInput} filter={orangeFilter} /></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 3: Zain */}
        <div className="border-t-2 border-dashed border-slate-300 my-8"></div>
        <section className="bg-white rounded-xl shadow-sm border border-pink-200 overflow-hidden">
          <button onClick={() => setIsZainSectionOpen(!isZainSectionOpen)} className="w-full flex items-center justify-between p-4 bg-pink-50 hover:bg-pink-100 transition-colors">
            <div className="flex items-center gap-3"><span className="bg-pink-600 text-white px-3 py-1 rounded-md font-bold text-sm">القسم 3</span><h2 className="text-xl font-bold text-slate-700 flex items-center gap-2"><Smartphone size={20} className="text-pink-600" /> Zain Cash (زين كاش)</h2></div>
            {isZainSectionOpen ? <ChevronDown size={24} className="text-pink-600"/> : <ChevronRight size={24} className="text-pink-600"/>}
          </button>
          {isZainSectionOpen && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-pink-200 p-4 flex flex-col h-64 text-center items-center justify-center"><div className="w-full max-w-xs space-y-3"><div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-50 text-pink-600 mx-auto"><Upload size={24} /></div><h3 className="font-bold text-slate-700">1. ملف زين كاش</h3><label className="block w-full cursor-pointer bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg transition text-center shadow">اختيار ملف<input type="file" accept=".xlsx, .csv" onChange={handleZainFileUpload} className="hidden" /></label>{zainFileName && <div className="text-xs text-emerald-600 font-medium truncate bg-emerald-50 py-1 px-2 rounded">{zainFileName}</div>}</div></div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-64">
                   <div className="flex items-center justify-between mb-2 text-slate-700 font-bold border-b pb-2">
                     <span className="flex items-center gap-2"><ArrowDownLeft size={18} className="text-emerald-500"/> 2. فينيكس (إيداع)</span>
                     {zainPhxDepInput && <button onClick={() => setZainPhxDepInput('')}><Trash2 size={14} className="text-slate-400 hover:text-red-500"/></button>}
                   </div>
                   <textarea dir="ltr" className="text-left flex-1 w-full p-2 bg-slate-50 border rounded-lg text-sm font-mono resize-none focus:outline-emerald-400" placeholder="Phoenix Deposits..." value={zainPhxDepInput} onChange={(e) => setZainPhxDepInput(e.target.value)} />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-64">
                   <div className="flex items-center justify-between mb-2 text-slate-700 font-bold border-b pb-2">
                     <span className="flex items-center gap-2"><ArrowUpRight size={18} className="text-red-500"/> 3. فينيكس (سحب)</span>
                     {zainPhxWithInput && <button onClick={() => setZainPhxWithInput('')}><Trash2 size={14} className="text-slate-400 hover:text-red-500"/></button>}
                   </div>
                   <textarea dir="ltr" className="text-left flex-1 w-full p-2 bg-slate-50 border rounded-lg text-sm font-mono resize-none focus:outline-red-400" placeholder="Phoenix Withdrawals..." value={zainPhxWithInput} onChange={(e) => setZainPhxWithInput(e.target.value)} />
                </div>
              </div>
              <button onClick={handleZainMatching} disabled={!zainAgentData} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-[1.005] disabled:opacity-50 disabled:cursor-not-allowed">مطابقة Zain Cash</button>
              {zainResult && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white rounded-xl shadow border border-red-100 overflow-hidden flex flex-col">
                    <div className="p-3 bg-red-50 border-b border-red-100 font-bold text-red-800 flex justify-between items-center">
                       <span>عمليات السحب (Withdrawals) <span className="bg-white px-2 rounded-full text-xs border border-red-200 ms-2">{zainResult.withdrawals.length}</span></span>
                       <FilterButtons filter={zainFilter} setFilter={setZainFilter} />
                    </div>
                    <div className="overflow-x-auto"><ReconcileTable data={zainResult.withdrawals} type="withdrawal" onEdit={(id, val) => handleWalletEdit('zain', 'withdrawal', id, val)} rawPoolInput={zainPhxWithInput} filter={zainFilter} /></div>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-emerald-100 overflow-hidden flex flex-col">
                    <div className="p-3 bg-emerald-50 border-b border-emerald-100 font-bold text-emerald-800 flex justify-between items-center">
                       <span>عمليات الإيداع (Deposits) <span className="bg-white px-2 rounded-full text-xs border border-emerald-200 ms-2">{zainResult.deposits.length}</span></span>
                       <FilterButtons filter={zainFilter} setFilter={setZainFilter} />
                    </div>
                    <div className="overflow-x-auto"><ReconcileTable data={zainResult.deposits} type="deposit" onEdit={(id, val) => handleWalletEdit('zain', 'deposit', id, val)} rawPoolInput={zainPhxDepInput} filter={zainFilter} /></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 4: Prof */}
        <div className="border-t-2 border-dashed border-slate-300 my-8"></div>
        <section className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
          <button onClick={() => setIsProfSectionOpen(!isProfSectionOpen)} className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 transition-colors">
            <div className="flex items-center gap-3"><span className="bg-purple-600 text-white px-3 py-1 rounded-md font-bold text-sm">القسم 4</span><h2 className="text-xl font-bold text-slate-700 flex items-center gap-2"><Users size={20} className="text-purple-600" /> عمليات المحترف 2 و 3</h2></div>
            {isProfSectionOpen ? <ChevronDown size={24} className="text-purple-600"/> : <ChevronRight size={24} className="text-purple-600"/>}
          </button>
          {isProfSectionOpen && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top-4">
              <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={18} /> يتم استخراج بيانات هذا القسم تلقائياً من ملف مدفوعاتكم في القسم 1 (العمليات باسم "المحترف 1").</div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-52">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-slate-700 flex gap-2"><ClipboardPaste size={18} className="text-purple-600"/> قيم فينيكس (المحترف)</h3>
                  {profPhoenixInput && <button onClick={() => setProfPhoenixInput('')} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={12}/> مسح</button>}
                </div>
                <textarea dir="ltr" className="text-left flex-1 w-full p-2 bg-slate-50 border rounded-lg text-sm font-mono resize-none focus:outline-purple-400" placeholder="Paste Phoenix numbers here..." value={profPhoenixInput} onChange={(e) => setProfPhoenixInput(e.target.value)} />
                <button onClick={handleProfPhoenixMatching} disabled={!processedData?.separated?.length} className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">{isProfMatched ? "تحديث المطابقة" : "تشغيل المطابقة"}</button>
              </div>
              {processedData?.separated && processedData.separated.length > 0 ? (
                <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-3 bg-slate-50 border-b flex justify-between items-center sticky top-0 z-20">
                    <h3 className="font-bold text-slate-700 flex gap-2"><LayoutList size={20}/> النتائج ({processedData.separated.length})</h3>
                    <div className="flex items-center gap-3">
                      <FilterButtons filter={profFilter} setFilter={setProfFilter} />
                      <div className="w-px h-6 bg-slate-300 mx-1"></div>
                      <button 
                        onClick={() => setShowExtraInfo(!showExtraInfo)}
                        className={`p-1.5 rounded-full transition-colors ${showExtraInfo ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                        title={showExtraInfo ? "إخفاء المعلومات الإضافية" : "إظهار المعلومات الإضافية"}
                      >
                        {showExtraInfo ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto"><SortableTable data={sortedProfData} sortConfig={profSortConfig} requestSort={requestProfSort} onEdit={handleProfEdit} rawPhoenixInput={profPhoenixInput} showExtraInfo={showExtraInfo} filter={profFilter} /></div>
                  {profAnalysis && profAnalysis.hasErrors && (
                    <div className="border-t">
                      <button onClick={() => setIsProfAnalysisOpen(!isProfAnalysisOpen)} className="w-full flex justify-between p-3 bg-red-50 text-red-700 font-bold text-sm">
                        <div className="flex items-center gap-2"><FileWarning size={18}/> تنبيهات المطابقة ({profAnalysis.missing + profAnalysis.extra + profAnalysis.mismatch})</div>
                        {isProfAnalysisOpen ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                      </button>
                      {isProfAnalysisOpen && (
                        <div className="p-4 space-y-2 bg-white">
                          {profAnalysis.missing > 0 && <div className="text-xs text-red-600 flex gap-2"><XCircle size={14}/> {profAnalysis.missing} عملية مفقودة في فينيكس</div>}
                          {profAnalysis.extra > 0 && <div className="text-xs text-red-600 flex gap-2"><XCircle size={14}/> {profAnalysis.extra} عملية زائدة في فينيكس</div>}
                          {profAnalysis.mismatch > 0 && <div className="text-xs text-orange-600 flex gap-2"><AlertTriangle size={14}/> {profAnalysis.mismatch} فروقات في العمولة</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : <div className="text-center text-slate-400 p-8 border-2 border-dashed rounded-xl">لا توجد عمليات باسم "المحترف 1" في الملف المرفوع</div>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
