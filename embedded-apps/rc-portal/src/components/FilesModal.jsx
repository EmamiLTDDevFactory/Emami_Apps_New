import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Download, RefreshCw, Folder, Filter, CheckCircle2, ShieldAlert, UploadCloud, FileSpreadsheet, AlertCircle, Info } from 'lucide-react';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

export default function FilesModal({ isOpen, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [fetchError, setFetchError] = useState(null);

  // File Upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [consultantId, setConsultantId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setShowUploadForm(false);
      resetUploadState();
    }
  }, [isOpen]);

  const resetUploadState = () => {
    setSelectedUploadFile(null);
    setConsultantId('');
    setUploadMessage(null);
  };

  const fetchFiles = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      console.log('[FILES-MODAL] Calling GET /api/files (SAP FileSet)...');
      const response = await fetch(`${API_BASE_URL}/api/files`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('[FILES-MODAL] SAP FileSet data received:', data);
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[FILES-MODAL] Error fetching FileSet:', err);
      setFetchError('Failed to fetch files from SAP FileSet.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedUploadFile(null);
      setUploadMessage(null);
      return;
    }

    // Validate File Extension / Type
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

    // Validate File Name Character Length (<= 40 characters)
    if (fileName.length > 40) {
      setUploadMessage({ 
        type: 'error', 
        text: `Selected file name "${fileName}" exceeds 40 characters limit (current length: ${fileName.length} chars). Please rename your file to 40 characters or fewer before uploading.` 
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
      // Read file as Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultString = reader.result;
          const base64Content = resultString.split(',')[1] || resultString;

          console.log('[FILES-MODAL] Submitting POST /api/files (FILESET_CREATE_ENTITY)...');
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

          console.log('[FILES-MODAL] Upload successful:', data);
          setUploadMessage({ type: 'success', text: `File "${fileName}" uploaded successfully to SAP FileSet!` });
          
          // Refresh list from SAP
          fetchFiles();

          // Reset upload state after short delay
          setTimeout(() => {
            setShowUploadForm(false);
            resetUploadState();
          }, 1800);

        } catch (err) {
          console.error('[FILES-MODAL] Upload error:', err);
          setUploadMessage({ type: 'error', text: err.message || 'Failed to upload file to SAP.' });
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(selectedUploadFile);
    } catch (err) {
      console.error('[FILES-MODAL] FileReader error:', err);
      setUploadMessage({ type: 'error', text: 'Error reading selected file.' });
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  // Filtering files based on search term & document type
  const filteredFiles = files.filter((item) => {
    const filename = String(item.Filename || item.DocFilename || item.FilenameText || '').toLowerCase();
    const cId = String(item.ConsultantId || item.ObjectKey || item.DocId || '').toLowerCase();
    const docType = String(item.DocType || item.ObjectType || '').toLowerCase();
    const matchSearch = filename.includes(searchTerm.toLowerCase()) || 
                        cId.includes(searchTerm.toLowerCase()) || 
                        docType.includes(searchTerm.toLowerCase());
    
    if (selectedType === 'ALL') return matchSearch;
    if (selectedType === 'AGREEMENT') return matchSearch && (docType.includes('agreement') || filename.includes('agreement'));
    if (selectedType === 'INVOICE') return matchSearch && (docType.includes('invoice') || filename.includes('invoice'));
    return matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header with Deep Maroon Gradient Accent */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#800A36] via-[#600727] to-[#40041a] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 text-rose-200">
              <Folder className="h-6 w-6 text-rose-200" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">File Repository (FileSet)</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-2xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action & Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search file name, consultant ID..."
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

          <div className="flex items-center gap-2">
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
              className="flex items-center gap-2 rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-[#800A36] ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Upload Form Box (Clean & Compact) */}
        {showUploadForm && (
          <div className="border-b border-rose-200 bg-rose-50/70 p-5 animate-fadeIn">
            {uploadMessage && (
              <div className={`mb-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                uploadMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : uploadMessage.type === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {uploadMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                {uploadMessage.type === 'info' && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
                {uploadMessage.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
                <span>{uploadMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5 w-full">
                {/* File Picker */}
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select PDF or Excel File <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept=".pdf, .xlsx, .xls, .csv, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  onChange={handleFileSelect}
                  className="rc-input bg-white text-xs font-bold text-slate-800 border-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-rose-100 file:text-[#800A36] hover:file:bg-rose-200 cursor-pointer"
                />
                <p className="text-[11px] font-medium text-slate-500">Allowed formats: .pdf, .xlsx, .xls, .csv (Max 40 chars filename)</p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
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

        {/* File Table / Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 border-4 border-[#800A36]/30 border-t-[#800A36] rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-700">Calling FILESET_GET_ENTITYSET from SAP...</p>
              <p className="text-xs text-slate-400 mt-1">Please wait while documents are fetched.</p>
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm font-bold text-red-700">{fetchError}</p>
              <button onClick={fetchFiles} className="mt-3 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700">Retry Request</button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-16 text-center">
              <Folder className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">No documents found in FileSet</p>
              <p className="text-xs text-slate-500 mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'SAP FileSet entity set returned 0 file records.'}</p>
              {!showUploadForm && (
                <button 
                  onClick={() => setShowUploadForm(true)} 
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#800A36] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#600727]"
                >
                  <UploadCloud className="h-4 w-4" /> Upload First File
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-[#800A36] via-[#600727] to-[#40041a] text-white font-bold tracking-wider text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3.5">Filename / Document</th>
                    <th className="px-4 py-3.5">Consultant ID</th>
                    <th className="px-4 py-3.5">Doc Type / MIME</th>
                    <th className="px-4 py-3.5">Date Uploaded</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredFiles.map((file, idx) => {
                    const filename = file.Filename || file.DocFilename || `Document_${idx + 1}.pdf`;
                    const consultantIdVal = file.ConsultantId || file.ObjectKey || '-';
                    const mime = file.Mimetype || file.DocMime || 'application/pdf';
                    const docType = file.DocType || file.ObjectType || (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv') ? 'Excel Spreadsheet' : 'PDF Document');
                    const uploadDate = file.UploadedAt || file.CreatedAt || '-';
                    const isExcelDoc = mime.includes('excel') || mime.includes('spreadsheet') || filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv');

                    return (
                      <tr key={file.DocId || file.ConsultantId || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${isExcelDoc ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-[#800A36] border-rose-200'}`}>
                              {isExcelDoc ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 line-clamp-1">{filename}</div>
                              <div className="text-[11px] font-medium text-slate-500">{docType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                          {consultantIdVal}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            isExcelDoc ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {mime}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                          {uploadDate !== '-' && !isNaN(new Date(uploadDate)) ? new Date(uploadDate).toLocaleDateString() : String(uploadDate)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button 
                            onClick={() => {
                              if (file.Value || file.Base64) {
                                const link = document.createElement('a');
                                link.href = file.Value ? `data:${mime};base64,${file.Value}` : file.Base64;
                                link.download = filename;
                                link.click();
                              } else {
                                alert(`Downloading ${filename} from SAP FileSet...`);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#800A36] hover:bg-[#800A36] hover:text-white transition cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="font-semibold">Showing {filteredFiles.length} files from SAP FileSet</div>
          <button onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
