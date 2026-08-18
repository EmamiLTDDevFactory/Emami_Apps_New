import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Settings, Plus, Trash2, X } from 'lucide-react';
import { createConsultant, getConsultant, updateConsultant, createFeeSlab } from '../services/odataService';
import ConfirmModal from '../components/ConfirmModal';
import SuccessModal from '../components/SuccessModal';

const initModel = () => ({
  ConsuName: '',
  ConsuType: 'INDIVIDUAL',
  PanNumber: '',
  GstNumber: '',
  ContactPers: '',
  ContactEmail: '',
  EngageType: 'RETAINED',
  ContStart: '',
  ContEnd: '',
  FeeType: 'PERCENT_CTC',
  FeeValue: '',
  PaytTerms: '30',
  CustomPaytTerms: '',
  ReplcPeriod: '',
  ReplacementClause: 'NO',
  Filename: '',
  Mimetype: '',
  Value: '',
  // Module Access Flags (TA, TM, L&D, OD)
  Ta: '',
  Tm: '',
  Ld: '',
  Od: '',
});

const steps = ['Basic Information', 'Contract & Payment Terms', 'Review & Submit'];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { consultantId } = useParams();
  const [formData, setFormData] = useState(initModel);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [slabs, setSlabs] = useState([{ FromAmount: '', ToAmount: '', FeePercent: '' }]);
  const [tempSlabs, setTempSlabs] = useState([]);
  const [showSlabModal, setShowSlabModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(Boolean(consultantId));
  const [successModalData, setSuccessModalData] = useState(null);
  const userRole = (localStorage.getItem('employeeRole') || '').trim();
  const isSuperadmin = userRole === 'S' || userRole === 'Superadmin';

  // Permission flags from user's login session (X = allowed, blank = disabled)
  const canSelectTa = isSuperadmin || localStorage.getItem('employeeTa') === 'X';
  const canSelectTm = isSuperadmin || localStorage.getItem('employeeTm') === 'X';
  const canSelectLd = isSuperadmin || localStorage.getItem('employeeLd') === 'X';
  const canSelectOd = isSuperadmin || localStorage.getItem('employeeOd') === 'X';

  useEffect(() => {
    if (!consultantId) return;

    // Helper: parse SAP OData /Date(ms)/ or ISO string → YYYY-MM-DD for date input
    function parseSapDate(val) {
      if (!val) return '';
      const match = val.match(/\/Date\((-?\d+)\)\//);
      if (match) {
        const d = new Date(parseInt(match[1], 10));
        return d.toISOString().split('T')[0];
      }
      // Fallback: ISO string
      return val.split('T')[0];
    }

    async function load() {
      const data = await getConsultant(consultantId);
      setFormData({
        ...initModel(),
        ...data,
        ContStart: parseSapDate(data.ContStart),
        ContEnd: parseSapDate(data.ContEnd),
        Ta: data.Ta || '',
        Tm: data.Tm || '',
        Ld: data.Ld || '',
        Od: data.Od || '',
      });
      setIsEditMode(true);
    }
    load();
  }, [consultantId]);

  // Load draft on mount (only in create mode)
  useEffect(() => {
    if (!consultantId) {
      const draft = sessionStorage.getItem('rc_onboarding_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFormData((prev) => ({ ...prev, ...parsed }));
          if (parsed.Slabs) {
            setSlabs(parsed.Slabs);
          }
        } catch (e) {
          console.error("Failed to parse onboarding draft", e);
        }
      }
    }
  }, [consultantId]);

  // Save draft on changes (only in create mode)
  useEffect(() => {
    if (!consultantId) {
      sessionStorage.setItem('rc_onboarding_draft', JSON.stringify({ ...formData, Slabs: slabs }));
    }
  }, [formData, slabs, consultantId]);

  const stepErrors = useMemo(() => {
    const result = {};
    if (currentStep === 0) {
      if (formData.ConsuName.trim().length < 3) result.ConsuName = 'Minimum 3 characters';
      if (!/^[A-Z0-9]{10}$/i.test(formData.PanNumber)) result.PanNumber = 'PAN must be 10 alphanumeric';
      if (!isValidEmail(formData.ContactEmail)) result.ContactEmail = 'Invalid email';
      if (!formData.ConsuType) result.ConsuType = 'Required';
      if (!formData.EngageType) result.EngageType = 'Required';
      if (!formData.ContactPers.trim()) result.ContactPers = 'Required';
    }
    if (currentStep === 1) {
      if (!formData.ContStart) result.ContStart = 'Required';
      if (!formData.ContEnd) result.ContEnd = 'Required';
      if (!formData.FeeType) result.FeeType = 'Required';
      if (formData.FeeType === 'FIXED_PER_HIRE' && !formData.FeeValue) result.FeeValue = 'Required';
      if (formData.FeeType === 'PERCENT_CTC') {
        const hasInvalidSlab = slabs.length === 0 || slabs.some(s => !s.FromAmount || !s.FeePercent);
        if (hasInvalidSlab) {
          result.Slabs = 'Please configure all slab fields';
        }
      }
      if (!formData.PaytTerms) result.PaytTerms = 'Required';
      if (formData.ReplacementClause === 'YES' && !formData.ReplcPeriod) result.ReplcPeriod = 'Required';
    }
    return result;
  }, [currentStep, formData, slabs]);

  // Real-time validation error updater
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const updated = {};
      Object.keys(errors).forEach((key) => {
        if (stepErrors[key]) {
          updated[key] = stepErrors[key];
        }
      });
      setErrors(updated);
    }
  }, [formData, stepErrors, errors]);

  function setField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const [isDragging, setIsDragging] = useState(false);

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
    if (file.type !== "application/pdf") {
      alert("Only PDF documents are allowed");
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
    setFormData((prev) => ({
      ...prev,
      Filename: file.name,
      Mimetype: file.type,
      Value: dataUrl.split(',')[1],
    }));
  }

  // Extract save logic so it can be triggered from modal confirm
  async function saveConsultant() {
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }

    // Helper: convert YYYY-MM-DD date string to SAP OData /Date(ms)/ format
    function toSapDate(dateStr) {
      if (!dateStr) return '';
      const ms = new Date(dateStr).getTime();
      return `/Date(${ms})/`;
    }

    const employeeId = localStorage.getItem('employeeId') || '';

    const payload = {
      ConsuName: formData.ConsuName,
      ConsuType: formData.ConsuType,
      PanNumber: formData.PanNumber,
      GstNumber: formData.GstNumber || '',
      ContactPers: formData.ContactPers,
      ContactEmail: formData.ContactEmail,
      EngageType: formData.EngageType,
      // SAP OData Edm.DateTime requires /Date(milliseconds)/ — NOT ISO strings
      ContStart: toSapDate(formData.ContStart),
      ContEnd: toSapDate(formData.ContEnd),
      FeeType: formData.FeeType,
      // SAP OData Edm.Decimal requires a decimal string e.g. "10000.00", not a JS number
      FeeValue: parseFloat(formData.FeeValue || 0).toFixed(2),
      // PaytTerms must be a string
      PaytTerms: formData.PaytTerms === 'CUSTOM' ? String(formData.CustomPaytTerms) : String(formData.PaytTerms),
      // ReplcPeriod must be a string
      ReplcPeriod: formData.ReplacementClause === 'YES' ? String(Number(formData.ReplcPeriod || 0)) : '0',
      Status: 'PENDING_APPROVAL',
      Filename: formData.Filename || '',
      Mimetype: formData.Mimetype || '',
      Value: formData.Value || '',
      // Module Access Flags (TA, TM, L&D, OD)
      Ta: formData.Ta === 'X' ? 'X' : '',
      Tm: formData.Tm === 'X' ? 'X' : '',
      Ld: formData.Ld === 'X' ? 'X' : '',
      Od: formData.Od === 'X' ? 'X' : '',
      CreatedBy: employeeId,
    };

    let createdConsultantId = consultantId;

    if (isEditMode) {
      await updateConsultant(consultantId, payload);
    } else {
      const res = await createConsultant(payload);
      createdConsultantId = res?.data?.ConsultantId || res?.d?.ConsultantId || res?.ConsultantId;
    }

    if (formData.FeeType === 'PERCENT_CTC' && createdConsultantId) {
      for (const slab of slabs) {
        const slabPayload = {
          FeeId: '',
          ConsultantId: createdConsultantId,
          FromAmount: parseFloat(slab.FromAmount || 0).toFixed(2),
          ToAmount: parseFloat(slab.ToAmount || 0).toFixed(2),
          FeePersent: parseFloat(slab.FeePercent || 0).toFixed(2)
        };
        await createFeeSlab(slabPayload);
      }
    }

    sessionStorage.removeItem('rc_onboarding_draft');
    setSuccessModalData({
      title: isEditMode ? "Consultant Updated" : "Consultant Onboarded",
      message: isEditMode 
        ? "The consultant profile details have been successfully updated in the system." 
        : "The consultant has been successfully onboarded. A dummy vendor code will be assigned shortly."
    });
  }

  async function handleSubmit(event) {
    // Keep compatibility with form submit events
    event?.preventDefault();
    await saveConsultant();
  }

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  function trySubmit() {
    // Validate current state before showing confirmation
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setShowConfirmModal(true);
  }

  function goNext() {
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }

  return (
    <div className="space-y-6">
      {/* Header Banner - Light Breathable Theme */}
      <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-white via-rose-50/50 to-pink-50/60 p-6 shadow-sm border border-rose-200/80 text-slate-900 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#800A36] via-rose-500 to-pink-400" />
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1.5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 px-3.5 py-2.5 text-[#800A36] hover:bg-[#800A36] hover:text-white hover:border-[#800A36] transition shadow-2xs cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 text-[#800A36] group-hover:text-white transition-colors" />
          <span className="text-xs font-black uppercase tracking-wider">Back</span>
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Edit Consultant' : 'Onboarding Consultant'}</h2>
          <p className="text-sm font-medium text-slate-600">Create or update consultant onboarding details across vendor networks.</p>
        </div>
      </div>

      <div className="rc-card p-8 bg-white border border-slate-200/90 shadow-sm rounded-3xl">
        {/* Step Progress Bar */}
        <div className="mb-10 flex items-center justify-center">
          {steps.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep;
            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    done 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                      : active 
                      ? 'bg-rc-teal border-rc-teal text-white shadow-md ring-4 ring-rc-teal/20 scale-105' 
                      : 'border-slate-300 bg-slate-50 text-slate-500 font-bold'
                  }`}>
                    {done ? <Check className="h-5 w-5 stroke-[3]" /> : <span className="text-sm font-black">{index + 1}</span>}
                  </div>
                  <div className={`absolute mt-14 text-xs font-black tracking-wide ${active ? 'text-rc-teal' : done ? 'text-slate-800' : 'text-slate-400'}`}>{step}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-[3px] w-14 transition-colors duration-300 md:mx-8 md:w-28 rounded-full ${done ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && currentStep < steps.length - 1) e.preventDefault(); }} className="space-y-6 mt-16">
          {currentStep === 0 && (
            <div className="rounded-3xl border border-rose-400/40 bg-gradient-to-br from-[#9E0D43] via-[#800A36] to-[#600727] p-8 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-300 via-pink-400 to-amber-300" />
              <div className="mb-6 flex items-center gap-3 border-b border-white/20 pb-4">
                <div className="h-6 w-1.5 rounded-full bg-amber-300"></div>
                <h3 className="text-xl font-black text-white tracking-tight">Basic Information</h3>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Consultant/Agency Name <span className="text-amber-300">*</span></label>
                  <input 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" 
                    value={formData.ConsuName} 
                    onChange={(e) => setField('ConsuName', e.target.value)} 
                    placeholder="e.g. Protiviti" 
                  />
                  {errors.ConsuName && <p className="text-xs font-bold text-amber-300">{errors.ConsuName}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Consultant Type <span className="text-amber-300">*</span></label>
                  <select 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white cursor-pointer shadow-inner" 
                    value={formData.ConsuType} 
                    onChange={(e) => setField('ConsuType', e.target.value)}
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="AGENCY">Agency</option>
                  </select>
                </div>

                {/* Module Type Checkboxes - Disabled if user login permission is blank */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Module Type</label>
                  <div className="bg-white/10 border border-white/20 p-4 sm:p-5 rounded-2xl backdrop-blur-xs flex items-center gap-7 flex-wrap">
                    <label className={`inline-flex items-center gap-2.5 transition-colors ${canSelectTa ? 'cursor-pointer group' : 'opacity-40 cursor-not-allowed'}`}>
                      <input
                        type="checkbox"
                        disabled={!canSelectTa}
                        checked={canSelectTa && formData.Ta === 'X'}
                        onChange={(e) => canSelectTa && setField('Ta', e.target.checked ? 'X' : '')}
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
                        onChange={(e) => canSelectTm && setField('Tm', e.target.checked ? 'X' : '')}
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
                        onChange={(e) => canSelectLd && setField('Ld', e.target.checked ? 'X' : '')}
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
                        onChange={(e) => canSelectOd && setField('Od', e.target.checked ? 'X' : '')}
                        className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed transition"
                      />
                      <span className={`text-sm font-black ${canSelectOd ? 'text-white group-hover:text-rose-200' : 'text-rose-200/50'}`}>
                        OD {!canSelectOd && <span className="text-[10px] font-bold text-rose-200/50 ml-0.5">(No Access)</span>}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">PAN Number <span className="text-amber-300">*</span></label>
                  <input 
                    className="rc-input uppercase font-mono font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" 
                    value={formData.PanNumber} 
                    onChange={(e) => setField('PanNumber', e.target.value.toUpperCase())} 
                    placeholder="ABCDE1234F" 
                  />
                  {errors.PanNumber && <p className="text-xs font-bold text-amber-300">{errors.PanNumber}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">GST Number</label>
                  <input 
                    className="rc-input uppercase font-mono font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" 
                    value={formData.GstNumber} 
                    onChange={(e) => setField('GstNumber', e.target.value.toUpperCase())} 
                    placeholder="Optional" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Contact Person <span className="text-amber-300">*</span></label>
                  <input 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" 
                    value={formData.ContactPers} 
                    onChange={(e) => setField('ContactPers', e.target.value)} 
                    placeholder="e.g. John Doe" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Contact Email <span className="text-amber-300">*</span></label>
                  <input 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" 
                    value={formData.ContactEmail} 
                    onChange={(e) => setField('ContactEmail', e.target.value)} 
                    placeholder="john@example.com" 
                  />
                  {errors.ContactEmail && <p className="text-xs font-bold text-amber-300">{errors.ContactEmail}</p>}
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Engagement Type <span className="text-amber-300">*</span></label>
                  <select 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white cursor-pointer shadow-inner" 
                    value={formData.EngageType} 
                    onChange={(e) => setField('EngageType', e.target.value)}
                  >
                    <option value="RETAINED">Retained</option>
                    <option value="CONTINGENCY">Contingency</option>
                    <option value="EXCLUSIVE">Exclusive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="rounded-3xl border border-rose-400/40 bg-gradient-to-br from-[#9E0D43] via-[#800A36] to-[#600727] p-8 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-300 via-pink-400 to-amber-300" />
              <div className="mb-6 flex items-center gap-3 border-b border-white/20 pb-4">
                <div className="h-6 w-1.5 rounded-full bg-amber-300"></div>
                <h3 className="text-xl font-black text-white tracking-tight">Contract & Payment Terms</h3>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Contract Start Date <span className="text-amber-300">*</span></label>
                  <input 
                    type="date" 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white cursor-pointer shadow-inner" 
                    value={formData.ContStart} 
                    onChange={(e) => setField('ContStart', e.target.value)} 
                  />
                  {errors.ContStart && <p className="text-xs font-bold text-amber-300">{errors.ContStart}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Contract End Date <span className="text-amber-300">*</span></label>
                  <input 
                    type="date" 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white cursor-pointer shadow-inner" 
                    value={formData.ContEnd} 
                    onChange={(e) => setField('ContEnd', e.target.value)} 
                  />
                  {errors.ContEnd && <p className="text-xs font-bold text-amber-300">{errors.ContEnd}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Fee Type <span className="text-amber-300">*</span></label>
                  <select 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white cursor-pointer shadow-inner" 
                    value={formData.FeeType} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        FeeType: val,
                        FeeValue: val === 'PERCENT_CTC' ? '' : prev.FeeValue
                      }));
                    }}
                  >
                    <option value="PERCENT_CTC">Percentage of CTC</option>
                    <option value="FIXED_PER_HIRE">Fixed Per Hire</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">
                    Fee Value {formData.FeeType === 'FIXED_PER_HIRE' && <span className="text-amber-300">*</span>}
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    disabled={formData.FeeType === 'PERCENT_CTC'}
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner disabled:bg-slate-100/50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-rose-200/40" 
                    value={formData.FeeValue} 
                    onChange={(e) => setField('FeeValue', e.target.value)} 
                    placeholder={formData.FeeType === 'PERCENT_CTC' ? 'N/A' : 'e.g. 8.33'} 
                  />
                  {errors.FeeValue && formData.FeeType === 'FIXED_PER_HIRE' && <p className="text-xs font-bold text-amber-300">{errors.FeeValue}</p>}
                  
                  {formData.FeeType === 'PERCENT_CTC' && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTempSlabs(JSON.parse(JSON.stringify(slabs)));
                          setShowSlabModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500 transition shadow-2xs cursor-pointer"
                      >
                        <Settings className="h-3.5 w-3.5" /> Configure Slab Matrix
                      </button>
                      <span className="text-xs font-semibold text-rose-200/80">
                        {slabs.filter(s => s.FromAmount && s.FeePercent).length} slab(s) defined
                      </span>
                      {errors.Slabs && <p className="text-xs font-bold text-amber-300 ml-auto">{errors.Slabs}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Payment Terms <span className="text-amber-300">*</span></label>
                  <select 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white cursor-pointer shadow-inner" 
                    value={formData.PaytTerms} 
                    onChange={(e) => setField('PaytTerms', e.target.value)}
                  >
                    <option value="30">30 Days</option>
                    <option value="45">45 Days</option>
                    <option value="60">60 Days</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  {errors.PaytTerms && <p className="text-xs font-bold text-amber-300">{errors.PaytTerms}</p>}
                </div>

                {formData.PaytTerms === 'CUSTOM' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Custom Days <span className="text-amber-300">*</span></label>
                    <input 
                      type="number" 
                      className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" 
                      value={formData.CustomPaytTerms} 
                      onChange={(e) => setField('CustomPaytTerms', e.target.value)} 
                      placeholder="e.g. 15" 
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Replacement Clause</label>
                  <select 
                    className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white cursor-pointer shadow-inner" 
                    value={formData.ReplacementClause} 
                    onChange={(e) => setField('ReplacementClause', e.target.value)}
                  >
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </div>

                {formData.ReplacementClause === 'YES' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Replacement Period (Days) <span className="text-amber-300">*</span></label>
                    <input 
                      type="number" 
                      className="rc-input font-bold text-slate-900 border-2 border-rose-200 focus:border-[#800A36] focus:ring-4 focus:ring-rose-300/50 transition-all bg-white shadow-inner" 
                      value={formData.ReplcPeriod} 
                      onChange={(e) => setField('ReplcPeriod', e.target.value)} 
                      placeholder="e.g. 90" 
                    />
                    {errors.ReplcPeriod && <p className="text-xs font-bold text-amber-300">{errors.ReplcPeriod}</p>}
                  </div>
                )}

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-100">Agreement Upload <span className="text-amber-300">*</span></label>
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
                        <p className="text-xs font-medium text-rose-200">PDF document only</p>
                      </div>
                      <input type="file" className="hidden" accept="application/pdf" onChange={handleUpload} />
                    </label>
                  </div>
                  {formData.Filename && <p className="text-sm font-extrabold text-amber-300 mt-1 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {formData.Filename}</p>}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="rounded-3xl border border-rose-400/40 bg-gradient-to-br from-[#9E0D43] via-[#800A36] to-[#600727] p-8 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-300 via-pink-400 to-amber-300" />
              <div className="mb-6 flex items-center gap-3 border-b border-white/20 pb-4">
                <div className="h-6 w-1.5 rounded-full bg-amber-300"></div>
                <h3 className="text-xl font-black text-white tracking-tight">Review & Submit</h3>
              </div>
              <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4.5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-4 w-4 text-emerald-700 stroke-[3]" />
                </div>
                <div className="text-sm font-bold text-emerald-900">A dummy vendor code will be auto-assigned after submission.</div>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-500">Basic Information</h4>
                  <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 rounded-2xl bg-slate-50 p-6 border border-slate-200">
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Consultant Name</span><span className="font-extrabold text-slate-900 text-sm">{formData.ConsuName || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Consultant Type</span><span className="font-extrabold text-slate-900 text-sm">{formData.ConsuType || '-'}</span></div>
                    <div className="flex flex-col md:col-span-2">
                      <span className="text-xs font-bold text-slate-500 mb-1">Module Type</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {formData.Ta === 'X' && <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-0.5 text-xs font-bold text-teal-800">TA</span>}
                        {formData.Tm === 'X' && <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-0.5 text-xs font-bold text-teal-800">TM</span>}
                        {formData.Ld === 'X' && <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-0.5 text-xs font-bold text-teal-800">L&D</span>}
                        {formData.Od === 'X' && <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-0.5 text-xs font-bold text-teal-800">OD</span>}
                        {formData.Ta !== 'X' && formData.Tm !== 'X' && formData.Ld !== 'X' && formData.Od !== 'X' && <span className="font-bold text-slate-800">-</span>}
                      </div>
                    </div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">PAN Number</span><span className="font-mono font-bold text-slate-900 text-sm">{formData.PanNumber || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">GST Number</span><span className="font-mono font-bold text-slate-900 text-sm">{formData.GstNumber || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Contact Person</span><span className="font-extrabold text-slate-900 text-sm">{formData.ContactPers || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Contact Email</span><span className="font-extrabold text-slate-900 text-sm">{formData.ContactEmail || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Engagement Type</span><span className="font-extrabold text-slate-900 text-sm">{formData.EngageType || '-'}</span></div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-500">Contract & Payment</h4>
                  <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 rounded-2xl bg-slate-50 p-6 border border-slate-200">
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Contract Start</span><span className="font-extrabold text-slate-900 text-sm">{formData.ContStart || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Contract End</span><span className="font-extrabold text-slate-900 text-sm">{formData.ContEnd || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Fee Type</span><span className="font-extrabold text-slate-900 text-sm">{formData.FeeType || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Fee Value</span><span className="font-extrabold text-slate-900 text-sm">{formData.FeeValue || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Payment Terms</span><span className="font-extrabold text-slate-900 text-sm">{formData.PaytTerms === 'CUSTOM' ? `${formData.CustomPaytTerms} Days` : `${formData.PaytTerms} Days`}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Replacement Clause</span><span className="font-extrabold text-slate-900 text-sm">{formData.ReplacementClause || '-'}</span></div>
                    {formData.ReplacementClause === 'YES' && (
                      <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Replacement Period</span><span className="font-extrabold text-slate-900 text-sm">{formData.ReplcPeriod} Days</span></div>
                    )}
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 mb-1">Agreement File</span><span className="font-extrabold text-slate-900 text-sm">{formData.Filename || 'No file uploaded'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 px-6 py-2.5 text-xs font-extrabold text-[#800A36] hover:bg-[#800A36] hover:text-white hover:border-[#800A36] transition shadow-2xs cursor-pointer"
              onClick={() => {
                if (currentStep > 0) setCurrentStep((prev) => prev - 1);
                else navigate(-1);
              }}
            >
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                className="rc-btn-primary rounded-2xl px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-[1.01]"
                onClick={goNext}
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                className="rc-btn-primary rounded-2xl px-8 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-[1.01]"
                onClick={trySubmit}
              >
                Submit Consultant
              </button>
            )}
          </div>
        </form>
      </div>

      <ConfirmModal
        open={showConfirmModal}
        title={isEditMode ? 'Confirm Update' : 'Confirm Onboarding Submission'}
        message={
          isEditMode
            ? `Are you sure you want to save the changes for ${formData.ConsuName}?`
            : `Are you sure you want to submit onboarding details for ${formData.ConsuName}?`
        }
        confirmText={isEditMode ? 'Save Changes' : 'Confirm & Submit'}
        onConfirm={async () => {
          setShowConfirmModal(false);
          await saveConsultant();
        }}
        onCancel={() => setShowConfirmModal(false)}
      />
      <SuccessModal 
        isOpen={Boolean(successModalData)} 
        title={successModalData?.title} 
        message={successModalData?.message} 
        onClose={() => {
          setSuccessModalData(null);
          navigate('/');
        }} 
      />

      {showSlabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300" />
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">Configure CTC Slab Matrix</h3>
                <p className="text-xs text-rose-200/70 mt-1">Define brackets of Cost to Company (CTC) and corresponding fee percentages.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSlabModal(false)}
                className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/40">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-slate-300 font-semibold text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">From CTC (₹)</th>
                    <th className="px-4 py-3 text-left">To CTC (₹)</th>
                    <th className="px-4 py-3 text-left">Fee (%)</th>
                    <th className="px-4 py-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tempSlabs.map((slab, index) => (
                    <tr key={index} className="hover:bg-slate-900/40 transition">
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="rc-input bg-slate-900/50 border-slate-800 text-white font-bold text-xs p-2 h-9 w-full shadow-inner"
                          value={slab.FromAmount}
                          onChange={(e) => {
                            const newSlabs = [...tempSlabs];
                            newSlabs[index].FromAmount = e.target.value;
                            setTempSlabs(newSlabs);
                          }}
                          placeholder="e.g. 0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="rc-input bg-slate-900/50 border-slate-800 text-white font-bold text-xs p-2 h-9 w-full shadow-inner"
                          value={slab.ToAmount}
                          onChange={(e) => {
                            const newSlabs = [...tempSlabs];
                            newSlabs[index].ToAmount = e.target.value;
                            setTempSlabs(newSlabs);
                          }}
                          placeholder="e.g. 800000"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          className="rc-input bg-slate-900/50 border-slate-800 text-white font-bold text-xs p-2 h-9 w-full shadow-inner"
                          value={slab.FeePercent}
                          onChange={(e) => {
                            const newSlabs = [...tempSlabs];
                            newSlabs[index].FeePercent = e.target.value;
                            setTempSlabs(newSlabs);
                          }}
                          placeholder="e.g. 8.33"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          disabled={tempSlabs.length <= 1}
                          onClick={() => {
                            const newSlabs = tempSlabs.filter((_, idx) => idx !== index);
                            setTempSlabs(newSlabs);
                          }}
                          className="p-1.5 rounded-xl border border-rose-950 bg-rose-900/20 text-rose-300 hover:bg-rose-900 hover:text-white hover:border-rose-900 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button */}
            <button
              type="button"
              onClick={() => {
                const lastTo = Number(tempSlabs[tempSlabs.length - 1]?.ToAmount || 0);
                const nextFrom = lastTo ? String(lastTo + 1) : '';
                setTempSlabs([...tempSlabs, { FromAmount: nextFrom, ToAmount: '', FeePercent: '' }]);
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-rose-800/40 rounded-2xl hover:border-rose-500 hover:bg-rose-900/20 text-xs font-bold text-rose-300 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" /> Add Slab Row
            </button>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowSlabModal(false)}
                className="rounded-2xl border-2 border-slate-800 bg-slate-900/60 px-5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-800 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const filledSlabs = tempSlabs.filter(s => s.FromAmount || s.ToAmount || s.FeePercent);
                  if (filledSlabs.length === 0) {
                    alert("Please configure at least one slab tier, or click Cancel.");
                    return;
                  }
                  const hasIncomplete = filledSlabs.some(s => !s.FromAmount || !s.FeePercent);
                  if (hasIncomplete) {
                    alert("Please fill in both the From CTC and Fee Percent for all active rows.");
                    return;
                  }
                  setSlabs(filledSlabs);
                  setShowSlabModal(false);
                }}
                className="rc-btn-primary rounded-2xl px-6 py-2 text-xs font-bold text-white shadow-md transition hover:scale-[1.01]"
              >
                Save Slabs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
