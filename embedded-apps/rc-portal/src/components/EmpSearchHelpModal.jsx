import { useState, useEffect } from 'react';
import { Search, X, UserCheck, Loader2 } from 'lucide-react';
import { getEmployees, getConsultants } from '../services/odataService';

export default function EmpSearchHelpModal({ open, onClose, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      async function fetchEmployees() {
        setLoading(true);
        try {
          // Call GET /api/employees -> SAP EmpSet
          console.log('[EmpSearchHelp] Calling getEmployees() -> SAP EmpSet...');
          const data = await getEmployees();
          if (Array.isArray(data) && data.length > 0) {
            setEmployees(data);
          } else {
            // Fallback to consultants list if EmpSet is empty
            const fallbackData = await getConsultants();
            setEmployees(fallbackData || []);
          }
        } catch (err) {
          console.error('[EmpSearchHelp] EmpSet call failed, falling back to consultants list:', err);
          try {
            const fallbackData = await getConsultants();
            setEmployees(fallbackData || []);
          } catch (e) {
            setEmployees([]);
          }
        } finally {
          setLoading(false);
        }
      }
      fetchEmployees();
    }
  }, [open]);

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const empId = (emp.ConsultantId || emp.EmpId || emp.Pernr || '').toString().toLowerCase();
    const name = (emp.ConsuName || emp.Name || emp.Ename || '').toString().toLowerCase();
    const role = (emp.ConsuType || emp.Role || '').toString().toLowerCase();
    return empId.includes(term) || name.includes(term) || role.includes(term);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      
      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Search Help: Employee Selection</h3>
            <p className="text-xs text-slate-500">Search by Employee ID or Name</p>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID (e.g. 90007422) or Name..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-sm focus:border-rc-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-rc-teal/20 transition"
            />
          </div>
        </div>

        {/* Employee List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-rc-teal mb-2" />
              <span className="text-xs font-semibold">Loading employee records...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No matching employees found. Try another search term.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-[35%]">Emp ID</th>
                    <th className="py-2.5 px-4 w-[45%]">Name</th>
                    <th className="py-2.5 px-4 text-right w-[20%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp, idx) => {
                    const empId = emp.ConsultantId || emp.EmpId || emp.Pernr || `EMP${idx + 1}`;
                    const empName = emp.ConsuName || emp.Name || emp.Ename || 'N/A';

                    return (
                      <tr 
                        key={empId + idx}
                        onClick={() => {
                          onSelect({ empId, name: empName });
                          onClose();
                        }}
                        className="hover:bg-teal-50/60 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-rc-teal">
                          {empId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {empName}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button 
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-bold text-rc-teal group-hover:underline"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Select
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
      </div>
    </div>
  );
}
