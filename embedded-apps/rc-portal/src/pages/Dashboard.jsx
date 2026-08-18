import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, Plus, UserCheck, Users, CreditCard, AlertTriangle, Search, ShieldCheck, FileText, Folder, ChevronLeft, ChevronRight, Calendar, ArrowUpDown } from 'lucide-react';
import KpiTile from '../components/KpiTile';
import { AppContext } from '../context/AppContext';
import { getConsultants } from '../services/odataService';
import { formatCurrency, formatDate, statusColor, statusText } from '../utils/formatters';

const initialFilters = { search: '', status: 'ALL', hires: 'ALL' };

const getAvatarColor = (name) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 
    'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { setBusy } = useContext(AppContext);
  const [consultants, setConsultants] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [kpis, setKpis] = useState({ activeConsultants: 0, totalHires: 0, totalFeesPaid: 0, zeroHireConsultants: 0 });

  useEffect(() => {
    async function load() {
      setBusy(true);
      try {
        const data = await getConsultants();
        setConsultants(data);
        setKpis({
          activeConsultants: data.filter((item) => item.Status === 'ACTIVE').length,
          totalHires: data.reduce((sum, item) => sum + Number(item.TotalHires || 0), 0),
          totalFeesPaid: data.reduce((sum, item) => sum + Number(item.TotalFees || 0), 0),
          zeroHireConsultants: data.filter((item) => !item.TotalHires || Number(item.TotalHires) === 0).length,
        });
      } finally {
        setBusy(false);
      }
    }
    load();
  }, [setBusy]);

  const [sortField, setSortField] = useState('ConsuName');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !text) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 text-slate-900 rounded-xs px-0.5 font-black">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const filteredConsultants = useMemo(() => {
    const search = filters.search.toLowerCase();
    const filtered = consultants.filter((item) => {
      const matchesSearch = !search || [item.ConsuName, item.DummyVendor, item.PanNumber].some((value) => (value || '').toString().toLowerCase().includes(search));
      const matchesStatus = filters.status === 'ALL' || 
                            (filters.status === 'INACTIVE' ? (item.Status === 'INACTIVE' || item.Status === 'ONHOLD') : item.Status === filters.status);
      const hires = Number(item.TotalHires || 0);
      let matchesHire = true;
      if (filters.hires === 'ZERO') matchesHire = hires === 0;
      if (filters.hires === 'ONE_FIVE') matchesHire = hires >= 1 && hires <= 5;
      if (filters.hires === 'FIVE_PLUS') matchesHire = hires > 5;
      return matchesSearch && matchesStatus && matchesHire;
    });

    // Apply Sorting
    return filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'TotalHires') {
        aVal = Number(a.TotalHires || 0);
        bVal = Number(b.TotalHires || 0);
      } else if (sortField === 'TotalFees') {
        aVal = Number(a.TotalFees || 0);
        bVal = Number(b.TotalFees || 0);
      } else if (sortField === 'ContStart') {
        const parseDateToMs = (val) => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && val.startsWith('/Date(')) {
            const ms = Number(val.match(/-?\d+/)?.[0]);
            return Number.isNaN(ms) ? 0 : ms;
          }
          const d = new Date(val);
          return Number.isNaN(d.getTime()) ? 0 : d.getTime();
        };
        aVal = parseDateToMs(a.ContStart);
        bVal = parseDateToMs(b.ContStart);
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [consultants, filters, sortField, sortAsc]);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    // reset to first page when filters or consultants change
    setPage(1);
  }, [filteredConsultants.length]);

  const totalPages = Math.max(1, Math.ceil(filteredConsultants.length / PAGE_SIZE));
  const paginatedConsultants = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredConsultants.slice(start, start + PAGE_SIZE);
  }, [filteredConsultants, page]);

  function handleKpiClick(type) {
    if (type === 'active') setFilters((prev) => ({ ...prev, status: 'ACTIVE' }));
    if (type === 'zero') setFilters((prev) => ({ ...prev, hires: 'ZERO' }));
    if (type === 'all') setFilters(initialFilters);
  }

  function exportCsv() {
    const rows = filteredConsultants.map((item) => {
      const escapeCsv = (val) => val ? `"${String(val).replace(/"/g, '""')}"` : '""';
      
      return {
        'Consultant Name': escapeCsv(item.ConsuName),
        'Consultant Type': escapeCsv(item.ConsuType),
        'Status': escapeCsv(item.Status),
        'Engagement Type': escapeCsv(item.EngageType),
        'Contract Start': escapeCsv(item.ContStart ? formatDate(item.ContStart) : ''),
        'Contract End': escapeCsv(item.ContEnd ? formatDate(item.ContEnd) : ''),
        'Total Hires': escapeCsv(item.TotalHires || 0),
        'Total Fees (INR)': escapeCsv(item.TotalFees || 0),
      };
    });

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `consultants_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  }

  const userRole = (localStorage.getItem('employeeRole') || '').trim();
  const isSuperadmin = userRole === 'S' || userRole === 'Superadmin';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile 
          title="Active Consultants" 
          subtitle="Current active consultants" 
          value={kpis.activeConsultants} 
          icon={UserCheck} 
          onClick={() => handleKpiClick('active')} 
          active={filters.status === 'ACTIVE'} 
          bgClass="bg-gradient-to-br from-[#800A36] to-[#5c0626] border border-[#9E0D43]/40 shadow-md" 
          titleClass="text-white/90 font-bold" 
          subtitleClass="text-white/70" 
          valueClass="text-white font-black" 
          iconBgClass="bg-white/20 text-white" 
          arrowBgClass="bg-white/20 text-white group-hover:bg-white group-hover:text-[#800A36]" 
        />
        <KpiTile 
          title="Total Hires" 
          subtitle="All consultant hires" 
          value={kpis.totalHires} 
          icon={Users} 
          onClick={() => handleKpiClick('all')} 
          bgClass="bg-gradient-to-br from-[#065F46] to-[#044E38] border border-[#059669]/40 shadow-md" 
          titleClass="text-white/90 font-bold" 
          subtitleClass="text-white/70" 
          valueClass="text-white font-black" 
          iconBgClass="bg-white/20 text-white" 
          arrowBgClass="bg-white/20 text-white group-hover:bg-white group-hover:text-[#065F46]" 
        />
        <KpiTile 
          title="Total Fees Paid" 
          subtitle="Accumulated consultant fees" 
          value={formatCurrency(kpis.totalFeesPaid)} 
          icon={CreditCard} 
          onClick={() => handleKpiClick('all')} 
          bgClass="bg-gradient-to-br from-[#5B21B6] to-[#431497] border border-[#7C3AED]/40 shadow-md" 
          titleClass="text-white/90 font-bold" 
          subtitleClass="text-white/70" 
          valueClass="text-white font-black" 
          iconBgClass="bg-white/20 text-white" 
          arrowBgClass="bg-white/20 text-white group-hover:bg-white group-hover:text-[#5B21B6]" 
        />
        <KpiTile 
          title="Zero Hires" 
          subtitle="Consultants without hires" 
          value={kpis.zeroHireConsultants} 
          icon={AlertTriangle} 
          onClick={() => handleKpiClick('zero')} 
          active={filters.hires === 'ZERO'} 
          bgClass="bg-gradient-to-br from-[#92400E] to-[#78350F] border border-[#D97706]/40 shadow-md" 
          titleClass="text-white/90 font-bold" 
          subtitleClass="text-white/70" 
          valueClass="text-white font-black" 
          iconBgClass="bg-white/20 text-white" 
          arrowBgClass="bg-white/20 text-white group-hover:bg-white group-hover:text-[#92400E]" 
        />
      </div>

      <div className="rc-card overflow-hidden border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
          <div>
            <div className="text-lg font-bold text-slate-900">Consultant Overview</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Manage and track vendor consultant records</div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input 
                value={filters.search} 
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} 
                className="rc-input w-48 sm:w-56 pl-9 bg-white" 
                placeholder="Search name, vendor, PAN..." 
              />
            </div>
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="rc-input w-36 bg-white font-medium text-slate-700">
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select value={filters.hires} onChange={(e) => setFilters((prev) => ({ ...prev, hires: e.target.value }))} className="rc-input w-36 bg-white font-medium text-slate-700">
              <option value="ALL">All Hires</option>
              <option value="ZERO">Zero Hires</option>
              <option value="ONE_FIVE">1 - 5 Hires</option>
              <option value="FIVE_PLUS">5+ Hires</option>
            </select>
            <button onClick={exportCsv} className="rc-btn-primary flex items-center gap-2 shadow-sm hover:shadow transition">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#800A36] via-[#600727] to-[#40041a] text-white font-bold tracking-wider text-xs uppercase shadow-sm">
              <tr>
                <th 
                  onClick={() => toggleSort('ConsuName')}
                  className="px-5 py-3.5 text-left cursor-pointer hover:bg-black/10 transition-colors select-none group/th"
                >
                  <div className="flex items-center gap-1">
                    <span>Consultant Name</span>
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-opacity ${sortField === 'ConsuName' ? 'opacity-100' : 'opacity-40 group-hover/th:opacity-80'}`} />
                  </div>
                </th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th 
                  onClick={() => toggleSort('ContStart')}
                  className="px-5 py-3.5 text-left cursor-pointer hover:bg-black/10 transition-colors select-none group/th"
                >
                  <div className="flex items-center gap-1">
                    <span>Contract Period</span>
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-opacity ${sortField === 'ContStart' ? 'opacity-100' : 'opacity-40 group-hover/th:opacity-80'}`} />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('TotalHires')}
                  className="px-5 py-3.5 text-left cursor-pointer hover:bg-black/10 transition-colors select-none group/th"
                >
                  <div className="flex items-center gap-1">
                    <span>Hires</span>
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-opacity ${sortField === 'TotalHires' ? 'opacity-100' : 'opacity-40 group-hover/th:opacity-80'}`} />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('TotalFees')}
                  className="px-5 py-3.5 text-left cursor-pointer hover:bg-black/10 transition-colors select-none group/th"
                >
                  <div className="flex items-center gap-1">
                    <span>Fees</span>
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-opacity ${sortField === 'TotalFees' ? 'opacity-100' : 'opacity-40 group-hover/th:opacity-80'}`} />
                  </div>
                </th>
                <th className="px-5 py-3.5 text-left">Last Closure</th>
                <th className="px-5 py-3.5 text-left">Vendor Code</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 bg-white">
              {paginatedConsultants.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-500 font-bold">
                    No consultant records found matching the criteria.
                  </td>
                </tr>
              ) : (
                paginatedConsultants.map((item, idx) => {
                  const isEven = idx % 2 === 0;

                  return (
                    <tr 
                      key={item.ConsultantId || item.ConsuId} 
                      onClick={() => navigate(`/consultants/${item.ConsultantId || item.ConsuId}`)} 
                      className={`group cursor-pointer border-b border-slate-200/80 transition-colors ${
                        isEven ? 'bg-white hover:bg-rose-50/40' : 'bg-slate-50/60 hover:bg-rose-50/50'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getAvatarColor(item.ConsuName)} text-xs font-black text-white shadow-xs`}>
                            {(item.ConsuName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-[#800A36] transition-colors">{highlightText(item.ConsuName, filters.search)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rc-status-pill text-xs font-extrabold ${statusColor(item.Status)}`}>
                          {statusText(item.Status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800 text-xs">
                        {item.ContStart ? `${formatDate(item.ContStart)} - ${formatDate(item.ContEnd)}` : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center justify-center min-w-[26px] px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${
                          Number(item.TotalHires || 0) === 0 
                            ? 'bg-slate-100 text-slate-600 border-slate-300' 
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {item.TotalHires || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800 text-xs">{formatCurrency(item.TotalFees || 0)}</td>
                      <td className="px-5 py-4 font-bold text-slate-800 text-xs">{item.LastClosure ? formatDate(item.LastClosure) : '-'}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-extrabold text-slate-800 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          {item.DummyVendor || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/consultants/${item.ConsultantId || item.ConsuId}`)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs font-bold text-[#800A36] hover:bg-[#800A36] hover:text-white hover:border-[#800A36] transition shadow-2xs cursor-pointer group/view"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#800A36] group-hover/view:text-white transition-colors" /> View
                          </button>
                          {item.Status === 'ACTIVE' && (
                            <button
                              onClick={() => navigate(`/closure/${item.ConsultantId || item.ConsuId}`)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition shadow-2xs cursor-pointer group/closure"
                              title="Log Closure"
                            >
                              <UserCheck className="h-3.5 w-3.5 text-emerald-800 group-hover/closure:text-white transition-colors" /> Closure
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="flex flex-col gap-3.5 p-4 md:hidden bg-slate-100/80">
          {paginatedConsultants.map((item) => (
            <div 
              key={item.ConsultantId || item.ConsuId} 
              onClick={() => navigate(`/consultants/${item.ConsultantId || item.ConsuId}`)} 
              className="overflow-hidden rounded-2xl border-2 border-rose-200/80 bg-gradient-to-br from-white via-rose-50/20 to-pink-50/30 shadow-sm active:scale-[0.99] transition-all cursor-pointer border-l-[4px] border-l-[#800A36]"
            >
              {/* Card Header Banner */}
              <div className="flex items-center justify-between border-b border-rose-100 bg-gradient-to-r from-rose-50/90 via-pink-50/60 to-rose-50/80 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getAvatarColor(item.ConsuName)} text-xs font-black text-white shadow-sm ring-2 ring-white`}>
                    {(item.ConsuName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 tracking-tight">{highlightText(item.ConsuName, filters.search)}</div>
                    <div className="mt-0.5 inline-block rounded-md bg-rose-100/90 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#800A36] border border-rose-200/80">
                      {item.DummyVendor || 'No Vendor'}
                    </div>
                  </div>
                </div>
                <span className={`rc-status-pill text-[11px] px-2.5 py-1 font-bold shadow-2xs ${statusColor(item.Status)}`}>
                  {statusText(item.Status)}
                </span>
              </div>
              
              {/* Body Details Grid */}
              <div className="p-3.5 grid grid-cols-3 gap-2.5">
                <div className="col-span-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#800A36] flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#800A36]" /> Contract Period
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-800">
                    {item.ContStart ? `${formatDate(item.ContStart)} - ${formatDate(item.ContEnd)}` : '-'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 text-right shadow-2xs flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#800A36]">Hires</div>
                  <div className="mt-0.5 text-base font-black text-[#800A36]">{item.TotalHires || 0}</div>
                </div>
              </div>
              
              {/* Card Footer Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50/40 border-t border-rose-100">
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                  Tap card for details <ChevronRight className="h-3 w-3 text-[#800A36]" />
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/consultants/${item.ConsultantId || item.ConsuId}`); }} 
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#800A36] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#600727] transition"
                >
                  <Eye className="h-3.5 w-3.5" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Crisp, Highly Visible Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-100/90 text-slate-800">
          <div className="text-xs font-bold text-slate-700">
            Showing <span className="font-extrabold text-[#800A36]">{filteredConsultants.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredConsultants.length)}</span> of <span className="font-extrabold text-slate-900">{filteredConsultants.length}</span> consultants
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(page - 1)} 
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-extrabold text-slate-800 shadow-2xs hover:bg-[#800A36] hover:text-white hover:border-[#800A36] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-xs font-extrabold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              Page {page} / {totalPages || 1}
            </span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(page + 1)} 
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-extrabold text-slate-800 shadow-2xs hover:bg-[#800A36] hover:text-white hover:border-[#800A36] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

