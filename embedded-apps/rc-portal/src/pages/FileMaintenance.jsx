import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, FileText, Download, RefreshCw, Folder, 
  UploadCloud, FileSpreadsheet, CheckCircle2, ShieldAlert, AlertCircle, Info,
  Trash2, CheckSquare, Square, X, Eye, ExternalLink,
  ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import SuccessModal from '../components/SuccessModal';
import * as XLSX from 'xlsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') 
  : 'http://localhost:5000';

const getExcelPreviewRows = (base64Str) => {
  if (!base64Str) return null;
  try {
    const workbook = XLSX.read(base64Str, { type: 'base64' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return null;
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    return {
      sheetName: firstSheetName,
      rows: jsonData.filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== '')).slice(0, 15)
    };
  } catch (err) {
    console.warn('[Excel Preview] Failed to parse Excel base64:', err);
    return null;
  }
};

export default function FileMaintenance() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [fetchError, setFetchError] = useState(null);

  // Sorting & Pagination state
  const [sortField, setSortField] = useState('FileNo');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection for Delete (Single / Bulk)
  const [selectedFileNos, setSelectedFileNos] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { fileNos: string[], filenames: string[] }

  // Hover Popover State (Desktop / Laptop View)
  const [hoveredFileIndex, setHoveredFileIndex] = useState(null);

  // Glance View Modal State (Click / Mobile Tap)
  const [glanceFile, setGlanceFile] = useState(null); // { file, fileNo, filename, mime, isExcelDoc, uploadDate }

  // File Upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
  const [isDragging, setIsDragging] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);

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

    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || 
                    file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv');

    if (!isPdf && !isExcel) {
      setUploadMessage({ type: 'error', text: 'Only PDF and Excel files (.pdf, .xlsx, .xls, .csv) are supported!' });
      setSelectedUploadFile(null);
      return;
    }

    if (fileName.length > 40) {
      setUploadMessage({ 
        type: 'error', 
        text: `Selected file name "${fileName}" exceeds 40 characters limit. Please rename it.` 
      });
      setSelectedUploadFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage({ 
        type: 'error', 
        text: `The file "${fileName}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). The maximum allowed upload size is 10MB. Please try uploading a smaller file.` 
      });
      setSelectedUploadFile(null);
      return;
    }

    setUploadMessage({ 
      type: 'info', 
      text: `File selected: "${fileName}"` 
    });
    setSelectedUploadFile(file);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType]);

  const resetUploadState = () => {
    setSelectedUploadFile(null);
    setUploadMessage(null);
  };

  const fetchFiles = async () => {
    setLoading(true);
    setFetchError(null);
    setSelectedFileNos([]);
    try {
      console.log('[FILE-MAINTENANCE] Fetching SAP FileSet entity set...');
      const response = await fetch(`${API_BASE_URL}/api/files`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('[FILE-MAINTENANCE] SAP FileSet data received:', data);
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[FILE-MAINTENANCE] Error fetching FileSet:', err);
      setFetchError('Failed to fetch file repository from SAP FileSet.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract key FileNo property
  const getFileNo = (item, idx) => {
    return item.FileNo || item.Fileno || item.FileNum || item.DocId || item.ObjectKey || item.ConsultantId || `FILE_${idx + 1}`;
  };

  // Download Trigger Helper
  const downloadFileItem = (file, filename, mime, fileNo) => {
    console.log('[DOWNLOAD-DEBUG] Checking file keys:', Object.keys(file || {}));
    const base64 = file?.Value || file?.value || file?.Base64 || file?.base64 || file?.Content || file?.FileData || file?.Attachment || file?.DocData;
    
    if (base64) {
      try {
        const link = document.createElement('a');
        const cleanMime = mime || 'application/octet-stream';
        link.href = base64.startsWith('data:') ? base64 : `data:${cleanMime};base64,${base64}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setUploadMessage({ type: 'success', text: `File "${filename}" downloaded successfully!` });
        return;
      } catch (err) {
        console.error('[DOWNLOAD-ERROR] Failed to trigger inline Base64 download:', err);
      }
    }

    // If Base64 binary is missing from SAP FileSet record
    const targetFileNo = fileNo || getFileNo(file, 0);
    console.warn(`[DOWNLOAD-WARN] File content not available in SAP for FileNo: ${targetFileNo}`);
    setUploadMessage({ 
      type: 'error', 
      text: `File binary content for "${filename}" (FileNo: ${targetFileNo}) is empty in SAP. Please upload a new file to enable downloads.` 
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedUploadFile(null);
      setUploadMessage(null);
      return;
    }

    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || 
                    file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv');

    if (!isPdf && !isExcel) {
      setUploadMessage({ type: 'error', text: 'Only PDF and Excel files (.pdf, .xlsx, .xls, .csv) are supported!' });
      setSelectedUploadFile(null);
      return;
    }

    if (fileName.length > 40) {
      setUploadMessage({ 
        type: 'error', 
        text: `Selected file name "${fileName}" exceeds 40 characters limit (current length: ${fileName.length} chars). Please rename your file to 40 characters or fewer before uploading.` 
      });
      setSelectedUploadFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage({ 
        type: 'error', 
        text: `The file "${fileName}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). The maximum allowed upload size is 10MB. Please try uploading a smaller file.` 
      });
      setSelectedUploadFile(null);
      return;
    }

    setUploadMessage({ 
      type: 'info', 
      text: `File selected: "${fileName}" (${fileName.length} / 40 chars)` 
    });
    setSelectedUploadFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUploadFile) return;

    const fileName = selectedUploadFile.name;
    if (fileName.length > 40) {
      setUploadMessage({ 
        type: 'error', 
        text: `Selected file name "${fileName}" exceeds 40 characters limit (current length: ${fileName.length} chars). Please rename your file to 40 characters or fewer.` 
      });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultString = reader.result;
          const base64Content = resultString.split(',')[1] || resultString;

          console.log('[FILE-MAINTENANCE] Submitting POST /api/files (FILESET_CREATE_ENTITY)...');
          const response = await fetch(`${API_BASE_URL}/api/files`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              Filename: fileName,
              Value: base64Content,
              Mimetype: selectedUploadFile.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            })
          });

          const data = await response.json();
          if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to upload file to SAP FileSet');
          }

          console.log('[FILE-MAINTENANCE] Upload successful:', data);
          fetchFiles();
          setShowUploadForm(false);
          resetUploadState();
          setSuccessModalData({
            title: "Upload Successful",
            message: `The document "${fileName}" has been successfully uploaded and saved in the SAP repository.`
          });
        } catch (err) {
          console.error('[FILE-MAINTENANCE] Upload error:', err);
          let errMsg = err.message || 'Failed to upload file to SAP.';
          if (errMsg.toLowerCase().includes('payload too large') || errMsg.includes('413') || errMsg.toLowerCase().includes('large') || errMsg.toLowerCase().includes('size')) {
            errMsg = 'The file is too large to be processed by the server. Please try uploading a smaller file (under 10MB).';
          }
          setUploadMessage({ type: 'error', text: errMsg });
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(selectedUploadFile);
    } catch (err) {
      console.error('[FILE-MAINTENANCE] FileReader error:', err);
      setUploadMessage({ type: 'error', text: 'Error reading selected file.' });
      setUploading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageNos = paginatedFiles.map((file, idx) => getFileNo(file, idx));
      setSelectedFileNos((prev) => {
        const otherNos = prev.filter((id) => !pageNos.includes(id));
        return [...otherNos, ...pageNos];
      });
    } else {
      const pageNos = paginatedFiles.map((file, idx) => getFileNo(file, idx));
      setSelectedFileNos((prev) => prev.filter((id) => !pageNos.includes(id)));
    }
  };

  const handleToggleSelect = (fileNo) => {
    setSelectedFileNos((prev) => 
      prev.includes(fileNo) ? prev.filter((id) => id !== fileNo) : [...prev, fileNo]
    );
  };

  // Single Deletion Request
  const promptSingleDelete = (file, idx, e) => {
    if (e) e.stopPropagation();
    const fNo = getFileNo(file, idx);
    const fname = file.Filename || file.DocFilename || `Document_${idx + 1}`;
    setDeleteConfirm({
      fileNos: [fNo],
      filenames: [fname]
    });
  };

  // Bulk Deletion Request
  const promptBulkDelete = () => {
    if (selectedFileNos.length === 0) return;
    const selectedFiles = filteredFiles.filter((f, idx) => selectedFileNos.includes(getFileNo(f, idx)));
    const names = selectedFiles.map((f, idx) => f.Filename || f.DocFilename || `Document_${idx + 1}`);
    setDeleteConfirm({
      fileNos: selectedFileNos,
      filenames: names
    });
  };

  // Execute Deletion in SAP OData (FILESET_DELETE_ENTITY)
  const executeDelete = async () => {
    if (!deleteConfirm || deleteConfirm.fileNos.length === 0) return;
    setDeleting(true);

    try {
      if (deleteConfirm.fileNos.length === 1) {
        const targetFileNo = deleteConfirm.fileNos[0];
        console.log(`[FILE-MAINTENANCE] Deleting single file FileNo: ${targetFileNo}...`);
        
        const response = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(targetFileNo)}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to delete file from SAP FileSet');
        }
        setUploadMessage({ type: 'success', text: `File "${deleteConfirm.filenames[0]}" (FileNo: ${targetFileNo}) deleted successfully!` });
      } else {
        console.log(`[FILE-MAINTENANCE] Bulk deleting ${deleteConfirm.fileNos.length} files...`);
        
        const response = await fetch(`${API_BASE_URL}/api/files/batch-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileNos: deleteConfirm.fileNos })
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to complete bulk deletion');
        }
        setUploadMessage({ type: 'success', text: `Successfully deleted ${deleteConfirm.fileNos.length} files from SAP FileSet!` });
      }

      setDeleteConfirm(null);
      setSelectedFileNos([]);
      if (glanceFile) setGlanceFile(null);
      fetchFiles();
    } catch (err) {
      console.error('[FILE-MAINTENANCE] Delete error:', err);
      setUploadMessage({ type: 'error', text: err.message || 'Failed to delete file(s) from SAP FileSet.' });
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredFiles = files.filter((item) => {
    const filename = String(item.Filename || item.DocFilename || item.FilenameText || '').toLowerCase();
    const fNo = String(item.FileNo || item.Fileno || item.ConsultantId || item.ObjectKey || '').toLowerCase();
    const docType = String(item.DocType || item.ObjectType || '').toLowerCase();
    const matchSearch = filename.includes(searchTerm.toLowerCase()) || 
                        fNo.includes(searchTerm.toLowerCase()) || 
                        docType.includes(searchTerm.toLowerCase());
    
    if (selectedType === 'ALL') return matchSearch;
    if (selectedType === 'AGREEMENT') return matchSearch && (docType.includes('agreement') || filename.includes('agreement'));
    if (selectedType === 'INVOICE') return matchSearch && (docType.includes('invoice') || filename.includes('invoice'));
    return matchSearch;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !String(text).trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) 
            ? <mark key={i} className="bg-amber-100 text-[#800A36] font-extrabold rounded-xs px-0.5">{part}</mark> 
            : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let aVal = '';
    let bVal = '';

    if (sortField === 'FileNo') {
      aVal = getFileNo(a, 0);
      bVal = getFileNo(b, 0);
    } else if (sortField === 'Filename') {
      aVal = a.Filename || a.DocFilename || '';
      bVal = b.Filename || b.DocFilename || '';
    } else if (sortField === 'DateUploaded') {
      aVal = a.UploadedAt || a.CreatedAt || '';
      bVal = b.UploadedAt || b.CreatedAt || '';
    }

    if (sortField === 'FileNo' && /^\d+$/.test(aVal) && /^\d+$/.test(bVal)) {
      return sortOrder === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    }

    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);
  const paginatedFiles = sortedFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isAllSelected = paginatedFiles.length > 0 && paginatedFiles.every((f, idx) => selectedFileNos.includes(getFileNo(f, idx)));

  return (
    <div className="space-y-6">
      
      {/* Top Breathable Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-r from-white via-rose-50/50 to-pink-50/60 p-6 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#800A36] via-[#9E0D43] to-rose-400" />
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-[#800A36]" /> Dashboard
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-100 text-[#800A36]">
                  <Folder className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Document Hub (FileSet)</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedFileNos.length > 0 && (
              <button
                onClick={promptBulkDelete}
                className="flex items-center gap-2 rounded-xl bg-red-600 border border-red-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition cursor-pointer animate-fadeIn"
              >
                <Trash2 className="h-4 w-4" /> Delete Selected ({selectedFileNos.length})
              </button>
            )}

            <button 
              onClick={() => {
                setShowUploadForm(!showUploadForm);
                if (showUploadForm) resetUploadState();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer ${
                showUploadForm 
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300' 
                  : 'bg-[#800A36] text-white hover:bg-[#600727] border border-[#9E0D43]/40'
              }`}
            >
              <UploadCloud className="h-4 w-4" /> {showUploadForm ? 'Cancel Upload' : 'Upload File'}
            </button>

            <button 
              onClick={fetchFiles}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-[#800A36] ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Global Toast Message Feedback */}
      {uploadMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-fadeIn ${
          uploadMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : uploadMessage.type === 'info'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2.5">
            {uploadMessage.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
            {uploadMessage.type === 'info' && <Info className="h-5 w-5 text-blue-600 shrink-0" />}
            {uploadMessage.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />}
            <span>{uploadMessage.text}</span>
          </div>
          <button onClick={() => setUploadMessage(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload File Form Drawer */}
      {showUploadForm && (
        <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-rose-100">
            <UploadCloud className="h-5 w-5 text-[#800A36]" />
            <h3 className="text-base font-black text-slate-900">Upload Document to SAP FileSet</h3>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="flex flex-col gap-2 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select PDF or Excel File <span className="text-red-500">*</span></label>
              <div className="flex items-center justify-center w-full">
                <label 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                    isDragging 
                      ? 'border-amber-400 bg-rose-50/20 scale-[1.01]' 
                      : 'border-rose-200/50 bg-rose-50/5 hover:bg-rose-50/15'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                    <UploadCloud className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-amber-500' : 'text-[#800A36]'}`} />
                    <p className="mb-1 text-sm text-slate-700 font-bold"><span className="font-extrabold text-[#800A36]">Click to upload</span> or drag and drop</p>
                    <p className="text-xs font-medium text-slate-400">PDF, XLSX, XLS, or CSV files</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf, .xlsx, .xls, .csv, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              {selectedUploadFile && (
                <p className="text-sm font-extrabold text-[#800A36] mt-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {selectedUploadFile.name}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  resetUploadState();
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedUploadFile}
                className="flex items-center gap-2 rounded-xl bg-[#800A36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#600727] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {uploading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating in SAP...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" /> Upload
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Files Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by file name, FileNo, doc type..."
                className="rc-input w-full pl-9 bg-white font-medium text-slate-900 border-slate-300 focus:border-[#800A36] focus:ring-2 focus:ring-rose-300 text-xs sm:text-sm"
              />
            </div>
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="rc-input bg-white font-semibold text-slate-800 border-slate-300 cursor-pointer text-xs sm:text-sm"
            >
              <option value="ALL">All Documents</option>
              <option value="AGREEMENT">Agreements</option>
              <option value="INVOICE">Invoices</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            {selectedFileNos.length > 0 && (
              <span className="text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
                Selected: <strong className="font-extrabold">{selectedFileNos.length}</strong> file(s)
              </span>
            )}
            <div>
              Total Files: <span className="font-extrabold text-[#800A36]">{filteredFiles.length}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-10 w-10 border-4 border-[#800A36]/30 border-t-[#800A36] rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-700">Fetching FileSet records from SAP...</p>
              <p className="text-xs text-slate-400 mt-1">Please wait while documents are loaded.</p>
            </div>
          ) : fetchError ? (
            <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm font-bold text-red-700">{fetchError}</p>
              <button onClick={fetchFiles} className="mt-3 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 cursor-pointer">Retry Request</button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-20 text-center">
              <Folder className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">No documents found in FileSet</p>
              <p className="text-xs text-slate-500 mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'SAP FileSet entity set returned 0 file records.'}</p>
              {!showUploadForm && (
                <button 
                  onClick={() => setShowUploadForm(true)} 
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#800A36] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#600727] cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4" /> Upload First File
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto max-h-[580px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#800A36] via-[#600727] to-[#40041a] text-white font-bold tracking-wider text-xs uppercase shadow-sm">
                    <tr>
                      <th className="px-4 py-4 w-10 text-center">
                        <input 
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="rounded border-rose-300 text-[#800A36] focus:ring-[#800A36] h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th 
                        onClick={() => handleSort('FileNo')} 
                        className="px-5 py-4 cursor-pointer select-none group/th"
                      >
                        <div className="flex items-center gap-1 justify-start">
                          <span>File No</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 transition-opacity ${sortField === 'FileNo' ? 'opacity-100' : 'opacity-40 group-hover/th:opacity-80'}`} />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('Filename')} 
                        className="px-5 py-4 cursor-pointer select-none group/th"
                      >
                        <div className="flex items-center gap-1 justify-start">
                          <span>Filename / Document</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 transition-opacity ${sortField === 'Filename' ? 'opacity-100' : 'opacity-40 group-hover/th:opacity-80'}`} />
                        </div>
                      </th>
                      <th className="px-5 py-4">Doc Type / MIME</th>
                      <th 
                        onClick={() => handleSort('DateUploaded')} 
                        className="px-5 py-4 cursor-pointer select-none group/th"
                      >
                        <div className="flex items-center gap-1 justify-start">
                          <span>Date Uploaded</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 transition-opacity ${sortField === 'DateUploaded' ? 'opacity-100' : 'opacity-40 group-hover/th:opacity-80'}`} />
                        </div>
                      </th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 bg-white">
                    {paginatedFiles.map((file, idx) => {
                      const fileNo = getFileNo(file, idx);
                      const filename = file.Filename || file.DocFilename || `Document_${idx + 1}.pdf`;
                      const mime = file.Mimetype || file.DocMime || 'application/pdf';
                      const docType = file.DocType || file.ObjectType || (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv') ? 'Excel Spreadsheet' : 'PDF Document');
                      const uploadDate = file.UploadedAt || file.CreatedAt || '-';
                      const isExcelDoc = mime.includes('excel') || mime.includes('spreadsheet') || filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv');
                      const isSelected = selectedFileNos.includes(fileNo);
                      const isHovered = hoveredFileIndex === idx;
                      const isEven = idx % 2 === 0;
                      const base64Data = file.Value || file.value || file.Base64 || file.base64 || file.Content || file.FileData || '';
                      const itemPayload = { file, fileNo, filename, mime, docType, isExcelDoc, uploadDate, base64Data };

                      return (
                        <tr 
                          key={fileNo} 
                          onClick={() => setGlanceFile(itemPayload)}
                          onMouseEnter={() => setHoveredFileIndex(idx)}
                          onMouseLeave={() => setHoveredFileIndex(null)}
                          className={`relative transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-rose-50/80 border-l-4 border-l-[#800A36]' 
                              : isHovered 
                              ? 'bg-rose-50/40 shadow-xs' 
                              : isEven 
                              ? 'bg-white' 
                              : 'bg-slate-50/60'
                          }`}
                        >
                          {/* Checkbox Column */}
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(fileNo)}
                              className="rounded border-slate-300 text-[#800A36] focus:ring-[#800A36] h-4 w-4 cursor-pointer"
                            />
                          </td>

                           {/* FileNo Key Column */}
                          <td className="px-5 py-4 font-mono text-xs font-extrabold text-[#800A36]">
                            {highlightText(fileNo, searchTerm)}
                          </td>

                          {/* Filename & Icon Column */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl border shrink-0 ${isExcelDoc ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-[#800A36] border-rose-200'}`}>
                                {isExcelDoc ? <FileSpreadsheet className="h-4.5 w-4.5" /> : <FileText className="h-4.5 w-4.5" />}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5 group" title={`Click to view glance preview of ${filename}`}>
                                  <span className="hover:text-[#800A36] transition">{highlightText(filename, searchTerm)}</span>
                                  <Eye className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                </div>
                                <div className="text-[11px] font-medium text-slate-500 mt-0.5">{highlightText(docType, searchTerm)}</div>
                              </div>
                            </div>
                          </td>

                          {/* MIME Type Badge */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border shadow-2xs ${
                              isExcelDoc ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}>
                              {highlightText(mime, searchTerm)}
                            </span>
                          </td>

                          {/* Date Uploaded */}
                          <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                            {uploadDate !== '-' && !isNaN(new Date(uploadDate)) ? new Date(uploadDate).toLocaleDateString() : String(uploadDate)}
                          </td>

                          {/* Actions (Download + Delete) */}
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => downloadFileItem(file, filename, mime, fileNo)}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-xs font-bold text-[#800A36] hover:bg-[#800A36] hover:text-white transition shadow-2xs cursor-pointer"
                                title="Download File"
                              >
                                <Download className="h-3.5 w-3.5" /> Download
                              </button>

                              <button 
                                onClick={(e) => promptSingleDelete(file, idx, e)}
                                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition shadow-2xs cursor-pointer"
                                title="Delete File from SAP FileSet"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="block md:hidden max-h-[580px] overflow-y-auto divide-y divide-slate-100 p-4 space-y-4">
                {paginatedFiles.map((file, idx) => {
                  const fileNo = getFileNo(file, idx);
                  const filename = file.Filename || file.DocFilename || `Document_${idx + 1}.pdf`;
                  const mime = file.Mimetype || file.DocMime || 'application/pdf';
                  const docType = file.DocType || file.ObjectType || (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv') ? 'Excel Spreadsheet' : 'PDF Document');
                  const uploadDate = file.UploadedAt || file.CreatedAt || '-';
                  const isExcelDoc = mime.includes('excel') || mime.includes('spreadsheet') || filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv');
                  const isSelected = selectedFileNos.includes(fileNo);
                  const base64Data = file.Value || file.value || file.Base64 || file.base64 || file.Content || file.FileData || '';
                  const itemPayload = { file, fileNo, filename, mime, docType, isExcelDoc, uploadDate, base64Data };

                  return (
                    <div 
                      key={fileNo}
                      onClick={() => setGlanceFile(itemPayload)}
                      className={`rounded-2xl border-2 p-4 pt-5 transition-all cursor-pointer space-y-3.5 relative overflow-hidden ${
                        isExcelDoc
                          ? isSelected
                            ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-300/40 shadow-xs'
                            : 'bg-gradient-to-br from-emerald-50/20 via-white to-white border-emerald-100 hover:border-emerald-300 hover:shadow-xs'
                          : isSelected
                            ? 'bg-rose-50/70 border-[#800A36] ring-2 ring-rose-200 shadow-xs'
                            : 'bg-gradient-to-br from-rose-50/10 via-white to-white border-rose-100 hover:border-rose-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Decorative colored top line */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                        isExcelDoc ? 'from-emerald-400 to-teal-500' : 'from-[#800A36] via-[#9E0D43] to-rose-400'
                      }`} />
                      {/* Top row: Checkbox, FileNo, and MIME Badge */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(fileNo)}
                            className="rounded border-slate-300 text-[#800A36] focus:ring-[#800A36] h-4.5 w-4.5 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] font-extrabold text-[#800A36]">
                            {highlightText(fileNo, searchTerm)}
                          </span>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black border uppercase ${
                          isExcelDoc ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {highlightText(mime.split('/').pop() || mime, searchTerm)}
                        </span>
                      </div>

                      {/* Middle row: File Icon and Filename */}
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${isExcelDoc ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-[#800A36] border-rose-200'}`}>
                          {isExcelDoc ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm tracking-tight break-all line-clamp-2" title={filename}>
                            {highlightText(filename, searchTerm)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{highlightText(docType, searchTerm)}</div>
                        </div>
                      </div>

                      {/* Bottom row: Date and Quick Action Buttons */}
                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400">
                          Uploaded: <span className="text-slate-600 font-extrabold">{uploadDate !== '-' && !isNaN(new Date(uploadDate)) ? new Date(uploadDate).toLocaleDateString() : String(uploadDate)}</span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => downloadFileItem(file, filename, mime, fileNo)}
                            className="inline-flex items-center justify-center p-2 rounded-xl border border-rose-200 bg-rose-50/80 text-[#800A36] hover:bg-[#800A36] hover:text-white transition cursor-pointer"
                            title="Download File"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          <button 
                            onClick={(e) => promptSingleDelete(file, idx, e)}
                            className="inline-flex items-center justify-center p-2 rounded-xl border border-red-200 bg-red-50/80 text-red-700 hover:bg-red-600 hover:text-white transition cursor-pointer"
                            title="Delete File"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Crisp, Highly Visible Pagination Footer */}
          {filteredFiles.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-100/90 text-slate-800">
              <div className="text-xs font-bold text-slate-700">
                Showing <span className="font-extrabold text-[#800A36]">{filteredFiles.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredFiles.length)}</span> of <span className="font-extrabold text-slate-900">{filteredFiles.length}</span> documents
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage <= 1} 
                  onClick={() => setCurrentPage(currentPage - 1)} 
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-extrabold text-slate-800 shadow-2xs hover:bg-[#800A36] hover:text-white hover:border-[#800A36] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-xs font-extrabold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  Page {currentPage} / {totalPages || 1}
                </span>
                <button 
                  disabled={currentPage >= totalPages} 
                  onClick={() => setCurrentPage(currentPage + 1)} 
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-extrabold text-slate-800 shadow-2xs hover:bg-[#800A36] hover:text-white hover:border-[#800A36] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>



      </div>

      {/* Glance View Modal / Mobile Tap Popup */}
      {glanceFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#800A36] via-[#9E0D43] to-rose-400" />
            
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${glanceFile.isExcelDoc ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-[#800A36] border-rose-200'}`}>
                  {glanceFile.isExcelDoc ? <FileSpreadsheet className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{glanceFile.filename}</h3>
                  <p className="text-xs font-mono font-bold text-[#800A36]">FileNo: {glanceFile.fileNo}</p>
                </div>
              </div>
              <button 
                onClick={() => setGlanceFile(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Document Content Preview / Excel Card View */}
            {glanceFile.isExcelDoc ? (
              (() => {
                const parsedExcel = getExcelPreviewRows(glanceFile.base64Data);
                if (parsedExcel && parsedExcel.rows && parsedExcel.rows.length > 0) {
                  const headers = parsedExcel.rows[0] || [];
                  const bodyRows = parsedExcel.rows.slice(1);

                  return (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-emerald-300 bg-white shadow-xs">
                      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-3.5 py-2 text-white flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
                          Spreadsheet Preview ({parsedExcel.sheetName})
                        </span>
                        <span className="font-mono text-[9px] font-bold text-emerald-200 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-700">
                          {parsedExcel.rows.length} rows preview
                        </span>
                      </div>

                      <div className="max-h-56 overflow-auto border-t border-emerald-100">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-emerald-50 text-emerald-950 font-extrabold sticky top-0 border-b border-emerald-200 z-10">
                            <tr>
                              <th className="p-2 w-8 text-center text-[10px] text-slate-400 border-r border-emerald-200 bg-emerald-100/60">#</th>
                              {headers.map((h, i) => (
                                <th key={i} className="p-2 font-bold border-r border-emerald-200/60 whitespace-nowrap min-w-[90px] text-slate-800">
                                  {String(h || `Col ${i + 1}`)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bodyRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-teal-50/50 transition">
                                <td className="p-2 text-center text-[10px] font-mono text-slate-400 bg-slate-50 border-r border-slate-200">{rIdx + 1}</td>
                                {headers.map((_, cIdx) => (
                                  <td key={cIdx} className="p-2 text-slate-800 font-medium border-r border-slate-100 whitespace-nowrap truncate max-w-[160px]">
                                    {String(row[cIdx] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 p-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-sm shrink-0">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">Excel Spreadsheet Document</h4>
                        <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          Microsoft Excel binary spreadsheet format ({glanceFile.mime}). Click <strong className="text-emerald-800">Download File</strong> below to open workbooks and formulas.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : glanceFile.base64Data ? (
              <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner">
                <div className="bg-slate-800 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-rose-300 flex items-center justify-between border-b border-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live PDF Content Preview
                  </span>
                  <span className="font-mono text-[9px] text-slate-400">PDF / Media Stream</span>
                </div>
                <iframe
                  src={`data:${glanceFile.mime || 'application/pdf'};base64,${glanceFile.base64Data}`}
                  title="Live Document Content Preview"
                  className="w-full h-64 border-none bg-white"
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Binary preview unavailable for this legacy record. Click <strong>Download File</strong> to save local copy.</span>
              </div>
            )}

            {/* Document Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Document Category</span>
                <span className="text-xs font-black text-slate-800">{glanceFile.docType}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Upload Date</span>
                <span className="text-xs font-black text-slate-800">{glanceFile.uploadDate}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 col-span-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">MIME Type</span>
                <span className="font-mono text-xs font-bold text-slate-800 break-all">{glanceFile.mime}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={(e) => promptSingleDelete(glanceFile.file, 0, e)}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setGlanceFile(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadFileItem(glanceFile.file, glanceFile.filename, glanceFile.mime, glanceFile.fileNo)}
                  className="flex items-center gap-2 rounded-xl bg-[#800A36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#600727] transition cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Download File
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 rounded-2xl bg-red-100 border border-red-200">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Confirm Deletion</h3>
                <p className="text-xs font-bold text-red-600">FILESET_DELETE_ENTITY</p>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-700 mb-4">
              Are you sure you want to delete <strong className="text-slate-900">{deleteConfirm.fileNos.length}</strong> file(s) from SAP FileSet? This operation will pass <code className="font-mono bg-slate-100 text-rose-800 px-1.5 py-0.5 rounded text-xs font-bold">FileNo</code> into SAP Gateway <code className="font-mono bg-slate-100 text-rose-800 px-1.5 py-0.5 rounded text-xs font-bold">IT_KEY_TAB</code>.
            </p>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 mb-5 space-y-1">
              {deleteConfirm.filenames.map((name, i) => (
                <div key={i} className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="truncate pr-2">• {name}</span>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">({deleteConfirm.fileNos[i]})</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={executeDelete}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting from SAP...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal 
        isOpen={Boolean(successModalData)} 
        title={successModalData?.title} 
        message={successModalData?.message} 
        onClose={() => setSuccessModalData(null)} 
      />
    </div>
  );
}
