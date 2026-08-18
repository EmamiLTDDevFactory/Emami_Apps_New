import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { createClosure, getClosure, updateClosure, getConsultant, getFeeSlabs } from '../services/odataService';
import SuccessModal from '../components/SuccessModal';

const initModel = () => ({
  CandName: '',
  Designation: '',
  CtcOffered: '',
  Doj: '',
  BandGrade: '',
  InvNumber: '',
  InvAmount: '',
  InvDate: '',
  Filename: '',
  Mimetype: '',
  Value: '',
  ClosureId: '',
  ConsultantId: '',
  Ta: '',
  Tm: '',
  Ld: '',
  Od: '',
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseDateForInput(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/Date(')) {
    const ms = parseInt(dateString.match(/\d+/)[0], 10);
    return new Date(ms).toISOString().slice(0, 10);
  }
  try {
    return new Date(dateString).toISOString().slice(0, 10);
  } catch (e) {
    return '';
  }
}

export default function Closure() {
  const navigate = useNavigate();
  const location = useLocation();
  const { consultantId, closureId } = useParams();
  const { setBusy } = useContext(AppContext);
  const [formData, setFormData] = useState(initModel);
  const [consultant, setConsultant] = useState(null);
  const [calculatedFee, setCalculatedFee] = useState(0);
  const [showVarianceWarning, setShowVarianceWarning] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [slabs, setSlabs] = useState([]);
  const [selectedSlabId, setSelectedSlabId] = useState('');

  // User session permissions
  const userRole = (localStorage.getItem('employeeRole') || '').trim();
  const isSuperadmin = userRole === 'S' || userRole === 'Superadmin';
  const canSelectTa = isSuperadmin || localStorage.getItem('employeeTa') === 'X';
  const canSelectTm = isSuperadmin || localStorage.getItem('employeeTm') === 'X';
  const canSelectLd = isSuperadmin || localStorage.getItem('employeeLd') === 'X';
  const canSelectOd = isSuperadmin || localStorage.getItem('employeeOd') === 'X';

  useEffect(() => {
    async function loadData() {
      setBusy(true);
      try {
        const preloadedConsultant = location.state?.consultantData;
        const consData = preloadedConsultant || await getConsultant(consultantId);
        setConsultant(consData);

        let loadedSlabs = [];
        if (consData.FeeType === 'PERCENT_CTC') {
          loadedSlabs = await getFeeSlabs(consultantId);
          setSlabs(loadedSlabs);
        }
        
        if (closureId) {
          setIsEditMode(true);
          const preloadedClosure = location.state?.closureData;
          const closureData = preloadedClosure || await getClosure(consultantId, closureId);
          setFormData({
            CandName: closureData.CandName || '',
            Designation: closureData.Designation || '',
            CtcOffered: closureData.CtcOffered || '',
            Doj: parseDateForInput(closureData.Doj),
            BandGrade: closureData.BandGrade || '',
            InvNumber: closureData.InvNumber || '',
            InvAmount: closureData.InvAmount || '',
            InvDate: parseDateForInput(closureData.InvDate),
            Filename: closureData.Filename || '',
            Mimetype: closureData.Mimetype || '',
            Value: '', 
            ClosureId: closureData.ClosureId || '',
            ConsultantId: closureData.ConsultantId || '',
            Ta: closureData.Ta || '',
            Tm: closureData.Tm || '',
            Ld: closureData.Ld || '',
            Od: closureData.Od || '',
          });
        }
      } catch (err) {
        console.error("Failed to load closure data", err);
      } finally {
        setBusy(false);
      }
    }
    loadData();
  }, [consultantId, closureId, location.state, setBusy]);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Auto-select slab band based on CtcOffered value
  useEffect(() => {
    if (slabs.length === 0 || !formData.CtcOffered) return;
    const ctc = Number(formData.CtcOffered);
    const matchingSlab = slabs.find(s => {
      const from = Number(s.FromAmount || 0);
      const to = Number(s.ToAmount || 0);
      if (to === 0 || to >= 99999999 || to < from) {
        return ctc >= from;
      }
      return ctc >= from && ctc <= to;
    });
    if (matchingSlab) {
      setSelectedSlabId(matchingSlab.FeeId);
    } else {
      setSelectedSlabId('');
    }
  }, [formData.CtcOffered, slabs]);

  useEffect(() => {
    if (!consultant) return;
    const ctc = Number(formData.CtcOffered || 0);
    let fee = 0;
    if (consultant.FeeType === 'PERCENT_CTC') {
      const activeSlab = slabs.find(s => s.FeeId === selectedSlabId);
      const percent = activeSlab ? Number(activeSlab.FeePersent || activeSlab.FeePercent || 0) : 0;
      fee = (ctc * percent) / 100;
    } else {
      const feeValue = Number(consultant.FeeValue || 0);
      fee = feeValue;
    }
    setCalculatedFee(fee);
    const variance = Number(formData.InvAmount || 0) - fee;
    setShowVarianceWarning(Math.abs(variance) / fee > 0.02 && fee > 0);
  }, [formData.CtcOffered, formData.InvAmount, consultant, slabs, selectedSlabId]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".doc") && !file.name.endsWith(".docx")) {
      alert("Only PDF or Word documents are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(`The file "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). The maximum allowed upload size is 10MB. Please choose a smaller file.`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setFormData((prev) => ({
      ...prev,
      Filename: file.name,
      Mimetype: file.type,
      Value: dataUrl.split(',')[1],
    }));
  };

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(`The file "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). The maximum allowed upload size is 10MB. Please choose a smaller file.`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setFormData((prev) => ({ ...prev, Filename: file.name, Mimetype: file.type, Value: dataUrl.split(',')[1] }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ClosureId: isEditMode ? closureId : "",
        ConsultantId: consultantId,
        CandName: formData.CandName,
        Designation: formData.Designation,
        CtcOffered: String(Number(formData.CtcOffered || 0).toFixed(2)),
        Doj: formData.Doj ? `${formData.Doj}T00:00:00` : null,
        BandGrade: formData.BandGrade,
        InvNumber: formData.InvNumber,
        InvAmount: String(Number(formData.InvAmount || 0).toFixed(2)),
        InvDate: formData.InvDate ? `${formData.InvDate}T00:00:00` : null,
        CalcFee: String(Number(calculatedFee || 0).toFixed(2)),
        Filename: formData.Filename,
        Mimetype: formData.Mimetype,
        Value: formData.Value,
        CandId: "",
        JdAssignId: "",
        Dept: "",
        Location: "",
        Pernr: "",
        Status: "PENDING_APPROVAL",
        Ta: formData.Ta === 'X' ? 'X' : '',
        Tm: formData.Tm === 'X' ? 'X' : '',
        Ld: formData.Ld === 'X' ? 'X' : '',
        Od: formData.Od === 'X' ? 'X' : '',
        CreatedBy: localStorage.getItem('employeeId') || '',
      };

      if (isEditMode) {
        await updateClosure(consultantId, closureId, payload);
      } else {
        await createClosure(payload);
      }
      setSuccessModalData({
        title: isEditMode ? "Closure Updated" : "Closure Logged",
        message: isEditMode
          ? "The candidate placement details have been successfully updated in the system."
          : "The candidate placement details have been successfully logged. An approval flow has been initiated."
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save closure");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-white via-rose-50/50 to-pink-50/60 p-6 shadow-sm border border-rose-200/80 text-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#800A36] via-rose-500 to-pink-400" />
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 px-3.5 py-2.5 text-[#800A36] hover:bg-[#800A36] hover:text-white hover:border-[#800A36] transition shadow-2xs cursor-pointer group" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 text-[#800A36] group-hover:text-white transition-colors" />
            <span className="text-xs font-black uppercase tracking-wider">Back</span>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Edit Closure' : 'Log Closure'}</h2>
            <p className="text-sm font-medium text-slate-600">Consultant: {consultant?.ConsuName || consultantId}</p>
          </div>
        </div>
      </div>
      <div className="rc-card p-6 bg-white border border-slate-200/90 shadow-sm rounded-3xl">
        {showVarianceWarning && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">Variance Warning - invoice amount differs from calculated fee by more than 2%.</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-rose-400/40 bg-gradient-to-br from-[#9E0D43] via-[#800A36] to-[#600727] p-6 md:p-8 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-300 via-pink-400 to-amber-300" />
            <div className="mb-6 flex items-center gap-3 border-b border-white/20 pb-4">
              <div className="h-6 w-1.5 rounded-full bg-amber-300"></div>
              <div className="text-xl font-black text-white tracking-tight">Candidate Joining Details</div>
            </div>
            
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100">
                <span>Candidate Name <span className="text-amber-300">*</span></span>
                <input className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" placeholder="e.g. John Doe" value={formData.CandName} onChange={(e) => updateField('CandName', e.target.value)} />
              </label>
              
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100">
                <span>Designation <span className="text-amber-300">*</span></span>
                <input className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" placeholder="e.g. Senior Developer" value={formData.Designation} onChange={(e) => updateField('Designation', e.target.value)} />
              </label>
              
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100">
                <span>CTC Offered (₹) <span className="text-amber-300">*</span></span>
                <input type="number" className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" placeholder="e.g. 1500000" value={formData.CtcOffered} onChange={(e) => updateField('CtcOffered', e.target.value)} />
              </label>
              
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100">
                <span>Joining Date <span className="text-amber-300">*</span></span>
                <input type="date" className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner cursor-pointer" value={formData.Doj} onChange={(e) => updateField('Doj', e.target.value)} />
              </label>
              
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100 sm:col-span-2 md:col-span-1">
                <span>Band/Grade <span className="text-amber-300">*</span></span>
                <input className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" placeholder="e.g. L3" value={formData.BandGrade} onChange={(e) => updateField('BandGrade', e.target.value)} />
              </label>

              {consultant?.FeeType === 'PERCENT_CTC' && (
                <div className="flex flex-col gap-2 sm:col-span-2 bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-xs">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">
                    Band Width (Select Slab) <span className="text-amber-300">*</span>
                  </label>
                  {slabs.length === 0 ? (
                    <div className="text-xs text-rose-200 font-semibold italic">
                      No slab configuration matrix found in SAP.
                    </div>
                  ) : (
                    <div className="grid gap-2 pt-1.5 sm:grid-cols-2">
                      {slabs.map((slab) => {
                        const fromVal = Number(slab.FromAmount || 0);
                        const toVal = Number(slab.ToAmount || 0);
                        const label = toVal === 0 || toVal >= 99999999 || toVal < fromVal
                          ? `₹${fromVal.toLocaleString('en-IN')} and above`
                          : `₹${fromVal.toLocaleString('en-IN')} - ₹${toVal.toLocaleString('en-IN')}`;
                        const percent = slab.FeePersent || slab.FeePercent || 0;
                        const slabDisplay = `${label} (${percent}%)`;
                        
                        return (
                          <label key={slab.FeeId} className="inline-flex items-center gap-2.5 cursor-pointer group bg-white/5 border border-white/10 p-2.5 rounded-xl hover:bg-white/15 transition-all">
                            <input
                              type="radio"
                              name="slabBandWidth"
                              checked={selectedSlabId === slab.FeeId}
                              onChange={() => setSelectedSlabId(slab.FeeId)}
                              className="h-4 w-4 border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-white group-hover:text-rose-200">
                              {slabDisplay}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Module Type Checkboxes - Disabled if user login permission is blank */}
              <div className="flex flex-col gap-2 sm:col-span-2 bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-xs">
                <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Module Type</label>
                <div className="flex items-center gap-7 pt-1.5 flex-wrap">
                  <label className={`inline-flex items-center gap-2.5 transition-colors ${canSelectTa ? 'cursor-pointer group' : 'opacity-40 cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      disabled={!canSelectTa}
                      checked={canSelectTa && formData.Ta === 'X'}
                      onChange={(e) => canSelectTa && updateField('Ta', e.target.checked ? 'X' : '')}
                      className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed transition"
                    />
                    <span className={`text-sm font-black ${canSelectTa ? 'text-white group-hover:text-rose-200' : 'text-rose-200/50'}`}>
                      TA {!canSelectTa && <span className="text-[10px] font-bold text-rose-200/50 ml-0.5">(No Access)</span>}
                    </span>
                  </label>

                  <label className={`inline-flex items-center gap-2.5 transition-colors ${canSelectTm ? 'cursor-pointer group' : 'opacity-40 cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      disabled={!canSelectTm}
                      checked={canSelectTm && formData.Tm === 'X'}
                      onChange={(e) => canSelectTm && updateField('Tm', e.target.checked ? 'X' : '')}
                      className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed transition"
                    />
                    <span className={`text-sm font-black ${canSelectTm ? 'text-white group-hover:text-rose-200' : 'text-rose-200/50'}`}>
                      TM {!canSelectTm && <span className="text-[10px] font-bold text-rose-200/50 ml-0.5">(No Access)</span>}
                    </span>
                  </label>

                  <label className={`inline-flex items-center gap-2.5 transition-colors ${canSelectLd ? 'cursor-pointer group' : 'opacity-40 cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      disabled={!canSelectLd}
                      checked={canSelectLd && formData.Ld === 'X'}
                      onChange={(e) => canSelectLd && updateField('Ld', e.target.checked ? 'X' : '')}
                      className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed transition"
                    />
                    <span className={`text-sm font-black ${canSelectLd ? 'text-white group-hover:text-rose-200' : 'text-rose-200/50'}`}>
                      L&D {!canSelectLd && <span className="text-[10px] font-bold text-rose-200/50 ml-0.5">(No Access)</span>}
                    </span>
                  </label>

                  <label className={`inline-flex items-center gap-2.5 transition-colors ${canSelectOd ? 'cursor-pointer group' : 'opacity-40 cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      disabled={!canSelectOd}
                      checked={canSelectOd && formData.Od === 'X'}
                      onChange={(e) => canSelectOd && updateField('Od', e.target.checked ? 'X' : '')}
                      className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed transition"
                    />
                    <span className={`text-sm font-black ${canSelectOd ? 'text-white group-hover:text-rose-200' : 'text-rose-200/50'}`}>
                      OD {!canSelectOd && <span className="text-[10px] font-bold text-rose-200/50 ml-0.5">(No Access)</span>}
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col justify-center rounded-2xl border border-white/20 bg-white/10 p-4 sm:col-span-2 backdrop-blur-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-200">Calculated Fee (Auto)</div>
                <div className="mt-1 text-2xl font-black text-white">₹{calculatedFee}</div>
              </div>
              
              <div className="my-2 border-t border-white/10 sm:col-span-2"></div>
              
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100">
                <span>Invoice Number</span>
                <input className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" placeholder="e.g. INV-2026-001" value={formData.InvNumber} onChange={(e) => updateField('InvNumber', e.target.value)} />
              </label>
              
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100">
                <span>Invoice Date</span>
                <input type="date" className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner cursor-pointer" value={formData.InvDate} onChange={(e) => updateField('InvDate', e.target.value)} />
              </label>
              
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100 sm:col-span-2 md:col-span-1">
                <span>Invoice Amount (₹)</span>
                <input type="number" className="rc-input w-full font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" placeholder="e.g. 125000" value={formData.InvAmount} onChange={(e) => updateField('InvAmount', e.target.value)} />
              </label>
              
              <div className="my-2 border-t border-white/10 sm:col-span-2"></div>
              
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Document Upload (Invoice PDF or Resume Doc/PDF) <span className="text-amber-300">*</span></label>
                <div className="flex items-center justify-center w-full">
                  <label 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                      isDragging 
                        ? 'border-amber-400 bg-white/20 scale-[1.01]' 
                        : 'border-rose-200/50 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                      <svg className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-amber-300' : 'text-rose-200'}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                      <p className="mb-1 text-sm text-white font-bold"><span className="font-extrabold text-amber-300">Click to upload</span> or drag and drop</p>
                      <p className="text-xs font-medium text-rose-200">PDF, DOC, or DOCX documents</p>
                    </div>
                    <input type="file" className="hidden" accept="application/pdf,.doc,.docx" onChange={handleUpload} />
                  </label>
                </div>
                {formData.Filename && <p className="text-sm font-extrabold text-amber-300 mt-1 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {formData.Filename}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 px-6 py-2.5 text-xs font-extrabold text-[#800A36] hover:bg-[#800A36] hover:text-white hover:border-[#800A36] transition shadow-2xs cursor-pointer" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="rc-btn-primary rounded-2xl px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-[1.01]">Submit Closure</button>
          </div>
        </form>
      </div>
      <SuccessModal 
        isOpen={Boolean(successModalData)} 
        title={successModalData?.title} 
        message={successModalData?.message} 
        onClose={() => {
          setSuccessModalData(null);
          navigate(-1);
        }} 
      />
    </div>
  );
}
