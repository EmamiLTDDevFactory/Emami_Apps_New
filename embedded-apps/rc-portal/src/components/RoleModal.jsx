import { useState, useEffect, useRef } from 'react';
import { X, Search, Check, Loader2 } from 'lucide-react';
import EmpSearchHelpModal from './EmpSearchHelpModal';
import { getEmployees } from '../services/odataService';

export default function RoleModal({ open, onClose, onSave }) {
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Admin');
  const [ta, setTa] = useState(true);
  const [tm, setTm] = useState(false);
  const [ld, setLd] = useState(false);
  const [od, setOd] = useState(false);
  const [status, setStatus] = useState('Active');

  // Typeahead Autocomplete State
  const [employeeList, setEmployeeList] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  // Pre-fetch employee list from SAP EmpSet when modal opens
  useEffect(() => {
    if (!open) return;

    async function loadEmpMaster() {
      setLoadingEmployees(true);
      try {
        const data = await getEmployees();
        setEmployeeList(data || []);
      } catch (err) {
        console.warn('[RoleModal] Failed to pre-fetch EmpSet:', err);
      } finally {
        setLoadingEmployees(false);
      }
    }

    loadEmpMaster();
  }, [open]);

  // Click outside listener to close floating suggestion dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter employee suggestions dynamically as user types
  const filteredSuggestions = employeeList.filter((emp) => {
    if (!name.trim()) return false;
    const query = name.toLowerCase().trim();
    const empName = (emp.name || emp.Ename || '').toLowerCase();
    const empId = (emp.empId || emp.EmpId || '').toLowerCase();
    return empName.includes(query) || empId.includes(query);
  });

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'Superadmin') {
      setTa(true);
      setTm(true);
      setLd(true);
      setOd(true);
    }
  };

  const handleEmployeeSelect = (selectedEmp) => {
    if (selectedEmp) {
      setEmployeeId(selectedEmp.empId || selectedEmp.EmpId || '');
      setName(selectedEmp.name || selectedEmp.Ename || '');
      if (selectedEmp.role && ['Superadmin', 'Admin', 'TA'].includes(selectedEmp.role)) {
        handleRoleChange(selectedEmp.role);
      }
      setShowSuggestions(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() && !employeeId.trim()) return;

    const cleanEmpId = employeeId.trim() || 'EMP' + Math.floor(100000 + Math.random() * 900000);
    const cleanName = name.trim() || `Employee ${cleanEmpId}`;

    // Mapping rules:
    // Role: Superadmin -> 'S', TA -> 'T', Admin -> 'A'
    const mappedRole = role === 'Superadmin' ? 'S' : (role === 'TA' ? 'T' : 'A');

    // Status: Active -> '', Inactive -> 'X'
    const mappedStatus = status === 'Active' ? '' : 'X';

    onSave({
      // UI Display Properties
      employeeId: cleanEmpId,
      name: cleanName,
      role,
      ta,
      tm,
      ld,
      od,
      status,

      // SAP UserSet CREATE_ENTITY Payload
      EmpId: cleanEmpId,
      Name: cleanName,
      Role: mappedRole,
      Del: mappedStatus, // SAP SEGW property name for Status/Active flag
      Ta: ta ? 'X' : '',
      Tm: tm ? 'X' : '',
      Ld: ld ? 'X' : '',
      Od: od ? 'X' : ''
    });

    // Reset fields
    setEmployeeId('');
    setName('');
    setRole('Admin');
    setTa(true);
    setTm(false);
    setLd(false);
    setOd(false);
    setStatus('Active');
    setShowSuggestions(false);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

        {/* Modal Container */}
        <div className="relative z-10 w-full max-w-5xl overflow-visible rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Add Role Assignment</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define employee module permissions and status in the tabular layout below.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Table Container */}
          <div className="mt-6 overflow-visible border border-slate-200 rounded-2xl shadow-2xs">
            <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                  <th className="py-4 px-5 w-[22%]">Search Employee Name</th>
                  <th className="py-4 px-5 w-[14%]">EMP ID</th>
                  <th className="py-4 px-5 w-[14%]">ROLE</th>
                  <th className="py-4 px-3 text-center w-[8%]">TA</th>
                  <th className="py-4 px-3 text-center w-[8%]">TM</th>
                  <th className="py-4 px-3 text-center w-[8%]">L&D</th>
                  <th className="py-4 px-3 text-center w-[8%]">OD</th>
                  <th className="py-4 px-5 text-center w-[18%]">STATUS</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="border-b border-slate-100 hover:bg-teal-50/20 transition-colors">
                  {/* Column 1: NAME with Live Typeahead Search & Search Help Button */}
                  <td className="py-4 px-5 overflow-visible">
                    <div className="relative flex items-center" ref={dropdownRef}>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search employee..."
                        className="w-full rounded-xl border border-slate-300 pr-9 pl-3 py-2 text-xs font-bold text-slate-900 focus:border-rc-teal focus:outline-none focus:ring-2 focus:ring-rc-teal/20 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSearchHelp(true)}
                        title="Search Help (Lookup EmpSet)"
                        className="absolute right-1.5 p-1 rounded-lg text-slate-400 hover:text-rc-teal hover:bg-teal-50 transition"
                      >
                        {loadingEmployees ? <Loader2 className="h-4 w-4 animate-spin text-rc-teal" /> : <Search className="h-4 w-4" />}
                      </button>

                      {/* Floating Typeahead Suggestions Dropdown */}
                      {showSuggestions && name.trim().length > 0 && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-fadeIn">
                          {filteredSuggestions.map((emp) => (
                            <button
                              key={emp.empId || emp.EmpId}
                              type="button"
                              onClick={() => handleEmployeeSelect(emp)}
                              className="w-full px-3 py-2 text-left hover:bg-teal-50/80 transition-colors flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                            >
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {emp.name || emp.Ename}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-rc-teal bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 shrink-0">
                                {emp.empId || emp.EmpId}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Column 2: EMP ID */}
                  <td className="py-4 px-5">
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. 90007422"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-rc-teal focus:outline-none focus:ring-2 focus:ring-rc-teal/20 transition"
                    />
                  </td>

                  {/* Column 3: ROLE Dropdown */}
                  <td className="py-4 px-5">
                    <select
                      value={role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-extrabold text-slate-800 focus:border-rc-teal focus:outline-none focus:ring-2 focus:ring-rc-teal/20 transition cursor-pointer bg-white"
                    >
                      <option value="Superadmin">Superadmin</option>
                      <option value="Admin">Admin</option>
                      <option value="TA">TA</option>
                    </select>
                  </td>

                  {/* TA Checkbox */}
                  <td className="py-4 px-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={ta}
                      disabled={role === 'Superadmin'}
                      onChange={(e) => setTa(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-rc-teal focus:ring-rc-teal/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                      title={role === 'Superadmin' ? 'Superadmin has full access to all modules' : ''}
                    />
                  </td>

                  {/* TM Checkbox */}
                  <td className="py-4 px-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={tm}
                      disabled={role === 'Superadmin'}
                      onChange={(e) => setTm(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-rc-teal focus:ring-rc-teal/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                      title={role === 'Superadmin' ? 'Superadmin has full access to all modules' : ''}
                    />
                  </td>

                  {/* L&D Checkbox */}
                  <td className="py-4 px-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={ld}
                      disabled={role === 'Superadmin'}
                      onChange={(e) => setLd(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-rc-teal focus:ring-rc-teal/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                      title={role === 'Superadmin' ? 'Superadmin has full access to all modules' : ''}
                    />
                  </td>

                  {/* OD Checkbox */}
                  <td className="py-4 px-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={od}
                      disabled={role === 'Superadmin'}
                      onChange={(e) => setOd(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-rc-teal focus:ring-rc-teal/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                      title={role === 'Superadmin' ? 'Superadmin has full access to all modules' : ''}
                    />
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-4 px-5 text-center">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-rc-teal focus:outline-none focus:ring-2 focus:ring-rc-teal/20 transition cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() && !employeeId.trim()}
              className="rc-btn-primary flex items-center gap-2 rounded-2xl px-6 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition hover:scale-[1.01]"
            >
              <Check className="h-4 w-4" /> Save Role Assignment
            </button>
          </div>
        </div>
      </div>

      {/* Employee Search Help Popup Modal */}
      <EmpSearchHelpModal
        open={showSearchHelp}
        onClose={() => setShowSearchHelp(false)}
        onSelect={handleEmployeeSelect}
      />
    </>
  );
}
