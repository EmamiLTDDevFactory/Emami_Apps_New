import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, ShieldCheck, Loader2, Pencil, Edit3, Check, X, Lock } from 'lucide-react';
import { getRoles, createRole } from '../services/odataService';
import RoleModal from '../components/RoleModal';

export default function RoleMaintenance() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editing state for inline single-row edit mode
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  const loadRoles = async () => {
    setSaving(true);
    try {
      console.log('[RoleMaintenance] Fetching live roles from SAP UserSet...');
      const sapRoles = await getRoles();
      if (Array.isArray(sapRoles) && sapRoles.length > 0) {
        const freshMapped = sapRoles.map((item, idx) => ({
          id: item.EmpId || `role-${idx}`,
          employeeId: item.EmpId || '',
          name: item.Name || `Employee ${item.EmpId}`,
          role: item.Role === 'S' ? 'Superadmin' : (item.Role === 'T' ? 'TA' : 'Admin'),
          ta: item.Ta === 'X',
          tm: item.Tm === 'X',
          ld: item.Ld === 'X',
          od: item.Od === 'X',
          status: item.Del === 'X' ? 'Inactive' : 'Active',
          accessType: item.Role || 'A'
        }));

        // Sort deterministically by numeric Employee ID so table order is constant across page refreshes & edits
        freshMapped.sort((a, b) => {
          const numA = parseInt(a.employeeId.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.employeeId.replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return a.employeeId.localeCompare(b.employeeId);
        });

        setRoles(freshMapped);
      }
    } catch (err) {
      console.warn('[RoleMaintenance] Failed to load live roles from SAP UserSet:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleRoleSave = async (roleData) => {
    setSaving(true);
    setError('');

    const payload = {
      EmpId: roleData.EmpId || roleData.employeeId,
      Name: roleData.Name || roleData.name || '',
      Role: roleData.Role || (roleData.role === 'Superadmin' ? 'S' : (roleData.role === 'TA' ? 'T' : 'A')),
      Del: roleData.Del !== undefined ? roleData.Del : (roleData.status === 'Active' ? '' : 'X'),
      Ta: roleData.Ta !== undefined ? roleData.Ta : (roleData.ta ? 'X' : ''),
      Tm: roleData.Tm !== undefined ? roleData.Tm : (roleData.tm ? 'X' : ''),
      Ld: roleData.Ld !== undefined ? roleData.Ld : (roleData.ld ? 'X' : ''),
      Od: roleData.Od !== undefined ? roleData.Od : (roleData.od ? 'X' : '')
    };

    try {
      console.log('[RoleMaintenance] Calling createRole (POST /UserSet) with payload:', payload);
      await createRole(payload);
      await loadRoles();
      setShowRoleModal(false);
    } catch (err) {
      console.warn('[RoleMaintenance] UserSet create status:', err);
      setRoles((prev) => [
        ...prev, 
        { ...roleData, id: `${roleData.employeeId}-${Date.now()}` }
      ]);
      setShowRoleModal(false);
    } finally {
      setSaving(false);
    }
  };

  // Inline Row Edit Controls
  const handleStartEdit = (roleItem) => {
    setEditingRowId(roleItem.id);
    setEditFormData({
      role: roleItem.role || 'Admin',
      ta: Boolean(roleItem.ta),
      tm: Boolean(roleItem.tm),
      ld: Boolean(roleItem.ld),
      od: Boolean(roleItem.od),
      status: roleItem.status || 'Active'
    });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData(null);
  };

  const handleSaveEdit = async (roleItem) => {
    if (!editFormData) return;
    setSaving(true);
    setError('');

    const payload = {
      EmpId: roleItem.employeeId,
      Name: roleItem.name,
      Role: editFormData.role === 'Superadmin' ? 'S' : (editFormData.role === 'TA' ? 'T' : 'A'),
      Del: editFormData.status === 'Active' ? '' : 'X',
      Ta: editFormData.ta ? 'X' : '',
      Tm: editFormData.tm ? 'X' : '',
      Ld: editFormData.ld ? 'X' : '',
      Od: editFormData.od ? 'X' : ''
    };

    // Optimistically update local state in-place so row position does not jump
    setRoles(prev => prev.map(r => r.employeeId === roleItem.employeeId ? {
      ...r,
      role: editFormData.role,
      ta: editFormData.ta,
      tm: editFormData.tm,
      ld: editFormData.ld,
      od: editFormData.od,
      status: editFormData.status,
      accessType: payload.Role
    } : r));

    try {
      console.log('[RoleMaintenance] Saving row edit to SAP (POST /UserSet):', payload);
      await createRole(payload);
      await loadRoles();
      setEditingRowId(null);
      setEditFormData(null);
    } catch (err) {
      console.error('[RoleMaintenance] Failed to save inline edit to SAP:', err);
      setError('Unable to save changes to SAP.');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineRoleChange = (newRole) => {
    setEditFormData((prev) => {
      if (newRole === 'Superadmin') {
        return { ...prev, role: newRole, ta: true, tm: true, ld: true, od: true };
      }
      return { ...prev, role: newRole };
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner - Light Breathable Theme */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-white via-rose-50/50 to-pink-50/60 p-6 shadow-sm border border-rose-200/80 text-slate-900 relative overflow-hidden">
        {/* Top glowing accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#800A36] via-rose-500 to-pink-400" />
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-100/70 border border-rose-200 text-[#800A36]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Role Maintenance</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 ml-12">
            Manage module authorization access matrix and active statuses across platform users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-[#800A36] hover:bg-rose-50 transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-[#800A36]" /> Back
          </button>
          <button 
            type="button" 
            onClick={() => setShowRoleModal(true)} 
            className="rc-btn-primary flex items-center gap-2 rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-md transition hover:scale-[1.01]"
          >
            <Plus className="h-4 w-4" /> Add Role
          </button>
        </div>
      </div>

      {/* Role Creation Table Modal */}
      <RoleModal 
        open={showRoleModal} 
        onClose={() => setShowRoleModal(false)} 
        onSave={handleRoleSave} 
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 animate-fadeIn">
          {error}
        </div>
      )}

      {/* Main Assigned Roles Container */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Header Title Bar */}
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">ASSIGNED USER PERMISSIONS</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Current authorization matrix for module permissions.</p>
            </div>
            <div className="text-xs font-bold text-rc-teal bg-teal-50 border border-teal-200/80 px-3.5 py-1 rounded-full">
              {roles.length} role{roles.length === 1 ? '' : 's'} assigned
            </div>
          </div>
        </div>

        {/* Loading / Empty States */}
        {saving && roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-rc-teal mb-2" />
            <span className="text-xs font-semibold">Loading live user roles from SAP...</span>
          </div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-500">
            No roles assigned yet. Click <span className="text-rc-teal font-bold">+ Add Role</span> to assign access.
          </div>
        ) : (
          <>
            {/* Desktop Wide Table View (`hidden md:block`) */}
            <div className="hidden md:block overflow-x-auto max-h-[580px] overflow-y-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#800A36] via-[#600727] to-[#40041a] text-white font-bold tracking-wider text-xs uppercase shadow-sm">
                  <tr className="border-b border-[#9E0D43]/40">
                    <th className="py-4 px-5 w-[20%]">NAME</th>
                    <th className="py-4 px-5 w-[14%]">EMP ID</th>
                    <th className="py-4 px-5 w-[14%]">ROLE</th>
                    <th className="py-4 px-3 text-center w-[9%]">TA</th>
                    <th className="py-4 px-3 text-center w-[9%]">TM</th>
                    <th className="py-4 px-3 text-center w-[9%]">L&D</th>
                    <th className="py-4 px-3 text-center w-[9%]">OD</th>
                    <th className="py-4 px-5 text-center w-[12%]">STATUS</th>
                    <th className="py-4 px-5 text-right w-[10%]">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {roles.map((roleItem, idx) => {
                    const isEditing = editingRowId === roleItem.id;
                    const isEven = idx % 2 === 0;
                    const empName = roleItem.name || `Employee ${roleItem.employeeId}`;
                    const initial = (empName.trim()[0] || 'E').toUpperCase();

                    const loggedInEmpId = (localStorage.getItem('employeeId') || '').trim();
                    const loggedInEmpName = (localStorage.getItem('employeeName') || '').trim().toLowerCase();
                    const isSelfAccount = (roleItem.employeeId && loggedInEmpId && String(roleItem.employeeId).trim() === loggedInEmpId) ||
                                          (roleItem.name && loggedInEmpName && String(roleItem.name).trim().toLowerCase() === loggedInEmpName);

                    return (
                      <tr 
                        key={roleItem.id} 
                        className={`transition-colors border-b border-slate-200/80 ${
                          isEditing 
                            ? 'bg-rose-50/90 border-l-4 border-[#800A36]' 
                            : isEven 
                            ? 'bg-white hover:bg-rose-50/40' 
                            : 'bg-slate-50/70 hover:bg-rose-50/50'
                        }`}
                      >
                        {/* Name - Column 1 with Avatar Circle */}
                        <td className="py-3.5 px-5 text-sm font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#800A36] to-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                              {initial}
                            </div>
                            <span className="line-clamp-1">{empName}</span>
                          </div>
                        </td>

                        {/* Emp ID - Column 2 */}
                        <td className="py-3.5 px-5 font-mono text-sm font-bold text-slate-700">
                          {roleItem.employeeId}
                        </td>

                        {/* Role - Column 3 */}
                        <td className="py-3.5 px-5">
                          {isEditing ? (
                            <select
                              value={editFormData?.role || 'Admin'}
                              onChange={(e) => handleInlineRoleChange(e.target.value)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-[#800A36] focus:outline-none focus:ring-2 focus:ring-rose-300 transition cursor-pointer shadow-2xs"
                            >
                              <option value="Superadmin">Superadmin</option>
                              <option value="Admin">Admin</option>
                              <option value="TA">TA</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black border shadow-2xs ${
                              roleItem.role === 'Superadmin'
                                ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 border-purple-300'
                                : roleItem.role === 'TA'
                                ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-900 border-emerald-300'
                                : 'bg-gradient-to-r from-sky-100 to-blue-100 text-blue-900 border-blue-300'
                            }`}>
                              {roleItem.role || 'Admin'}
                            </span>
                          )}
                        </td>

                        {/* TA Checkbox / Indicator */}
                        <td className="py-3.5 px-3 text-center align-middle">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={Boolean(editFormData?.ta)}
                              disabled={editFormData?.role === 'Superadmin'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, ta: e.target.checked }))}
                              className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                            />
                          ) : roleItem.ta ? (
                            <span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold shadow-2xs">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold text-xs">—</span>
                          )}
                        </td>

                        {/* TM Checkbox / Indicator */}
                        <td className="py-3.5 px-3 text-center align-middle">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={Boolean(editFormData?.tm)}
                              disabled={editFormData?.role === 'Superadmin'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, tm: e.target.checked }))}
                              className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                            />
                          ) : roleItem.tm ? (
                            <span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold shadow-2xs">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold text-xs">—</span>
                          )}
                        </td>

                        {/* L&D Checkbox / Indicator */}
                        <td className="py-3.5 px-3 text-center align-middle">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={Boolean(editFormData?.ld)}
                              disabled={editFormData?.role === 'Superadmin'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, ld: e.target.checked }))}
                              className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                            />
                          ) : roleItem.ld ? (
                            <span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold shadow-2xs">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold text-xs">—</span>
                          )}
                        </td>

                        {/* OD Checkbox / Indicator */}
                        <td className="py-3.5 px-3 text-center align-middle">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={Boolean(editFormData?.od)}
                              disabled={editFormData?.role === 'Superadmin'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, od: e.target.checked }))}
                              className="h-5 w-5 rounded border-rose-300 text-[#800A36] focus:ring-rose-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition"
                            />
                          ) : roleItem.od ? (
                            <span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold shadow-2xs">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold text-xs">—</span>
                          )}
                        </td>

                        {/* Status Dropdown / Badge */}
                        <td className="py-3.5 px-5 text-center">
                          {isEditing ? (
                            <select
                              value={editFormData?.status || 'Active'}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 focus:border-[#800A36] focus:outline-none focus:ring-2 focus:ring-rose-300 transition cursor-pointer shadow-2xs"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold border shadow-2xs ${
                              (roleItem.status || 'Active') === 'Active'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-slate-300 bg-slate-100 text-slate-600'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                (roleItem.status || 'Active') === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`} />
                              {roleItem.status || 'Active'}
                            </span>
                          )}
                        </td>

                        {/* Action - Edit / Save & Cancel */}
                        <td className="py-3.5 px-5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(roleItem)}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#800A36] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#600727] transition shadow-xs cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" /> Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center rounded-xl border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Cancel Edit"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : isSelfAccount ? (
                            <span 
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-xs font-extrabold text-slate-400 cursor-not-allowed select-none" 
                              title="You cannot edit your own logged-in account"
                            >
                              <Lock className="h-3.5 w-3.5 text-slate-400" /> Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(roleItem)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-xs font-bold text-[#800A36] hover:bg-[#800A36] hover:text-white transition shadow-2xs cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Card View (`block md:hidden`) */}
            <div className="p-4 flex flex-col gap-4 bg-slate-100/80 md:hidden">
              {roles.map((roleItem) => {
                const isEditing = editingRowId === roleItem.id;
                const empName = roleItem.name || `Employee ${roleItem.employeeId}`;
                const initial = (empName.trim()[0] || 'E').toUpperCase();

                const loggedInEmpId = (localStorage.getItem('employeeId') || '').trim();
                const loggedInEmpName = (localStorage.getItem('employeeName') || '').trim().toLowerCase();
                const isSelfAccount = (roleItem.employeeId && loggedInEmpId && String(roleItem.employeeId).trim() === loggedInEmpId) ||
                                      (roleItem.name && loggedInEmpName && String(roleItem.name).trim().toLowerCase() === loggedInEmpName);

                return (
                  <div 
                    key={roleItem.id} 
                    className={`overflow-hidden rounded-2xl border-2 transition-all shadow-sm ${
                      isEditing 
                        ? 'border-[#800A36] bg-rose-50/40 ring-2 ring-rose-200 p-4' 
                        : 'border-rose-200/80 bg-white p-4 border-l-[4px] border-l-[#800A36]'
                    }`}
                  >
                    {/* Card Header Banner */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#800A36] via-[#9E0D43] to-rose-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 ring-2 ring-white">
                          {initial}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 leading-snug">{empName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs font-extrabold text-[#800A36] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                              {roleItem.employeeId}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-black border shadow-2xs ${
                              roleItem.role === 'Superadmin'
                                ? 'bg-purple-50 text-purple-900 border-purple-300'
                                : roleItem.role === 'TA'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-blue-50 text-blue-900 border-blue-300'
                            }`}>
                              {roleItem.role || 'Admin'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Action (Edit / Save / Cancel) */}
                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(roleItem)}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#800A36] px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#600727] cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="rounded-xl border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-100"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : isSelfAccount ? (
                          <span 
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-400 cursor-not-allowed select-none" 
                            title="You cannot edit your own logged-in account"
                          >
                            <Lock className="h-3.5 w-3.5 text-slate-400" /> Protected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(roleItem)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3.5 py-1.5 text-xs font-bold text-[#800A36] bg-rose-50/80 hover:bg-[#800A36] hover:text-white transition shadow-2xs cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Permissions & Controls Grid */}
                    {isEditing ? (
                      <div className="mt-3 grid grid-cols-2 gap-2.5 pt-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editFormData?.ta)}
                            disabled={editFormData?.role === 'Superadmin'}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, ta: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-[#800A36] focus:ring-[#800A36] disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span>TA Access</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editFormData?.tm)}
                            disabled={editFormData?.role === 'Superadmin'}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, tm: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-[#800A36] focus:ring-[#800A36] disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span>TM Access</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editFormData?.ld)}
                            disabled={editFormData?.role === 'Superadmin'}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, ld: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-[#800A36] focus:ring-[#800A36] disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span>L&D Access</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editFormData?.od)}
                            disabled={editFormData?.role === 'Superadmin'}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, od: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-[#800A36] focus:ring-[#800A36] disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span>OD Access</span>
                        </label>
                        <div className="col-span-2 flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-700">Role Scope:</span>
                          <select
                            value={editFormData?.role || 'Admin'}
                            onChange={(e) => handleInlineRoleChange(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800"
                          >
                            <option value="Superadmin">Superadmin</option>
                            <option value="Admin">Admin</option>
                            <option value="TA">TA</option>
                          </select>
                        </div>
                        <div className="col-span-2 flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-700">Active Status:</span>
                          <select
                            value={editFormData?.status || 'Active'}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-between gap-2 pt-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${roleItem.ta ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {roleItem.ta ? '✓ TA' : '— TA'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${roleItem.tm ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {roleItem.tm ? '✓ TM' : '— TM'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${roleItem.ld ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {roleItem.ld ? '✓ L&D' : '— L&D'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${roleItem.od ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {roleItem.od ? '✓ OD' : '— OD'}
                          </span>
                        </div>

                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black border shadow-2xs shrink-0 ${
                          (roleItem.status || 'Active') === 'Active' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            (roleItem.status || 'Active') === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`} />
                          {roleItem.status || 'Active'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
