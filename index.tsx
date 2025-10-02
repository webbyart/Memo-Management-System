import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import Chart from 'chart.js/auto';
import Swal from 'sweetalert2';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, subYears } from 'date-fns';

// TYPES
interface Memo {
  id: string;
  memoNumber: string;
  date: string;
  teacher: string;
  subject: string;
  department: string;
  file?: {
    name: string;
    dataUrl: string;
  };
}
type Department = string;
type View = 'main' | 'stats';
type SortConfig = { key: keyof Memo; direction: 'ascending' | 'descending' } | null;

// ICONS (SVG Components)
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon-edit"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon-delete"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>;

// LOCAL STORAGE UTILS
const getFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const saveToStorage = <T,>(key: string, value: T) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving to localStorage key “${key}”:`, error);
    }
};

const DEFAULT_DEPARTMENTS = ["งานบริหารวิชาการ", "งานบริหารงบประมาณ", "งานบริหารบุคลากร", "งานบริหารทั่วไป"];

// HELPER FUNCTIONS
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const getBadgeColor = (department: string) => {
    switch (department) {
        case "งานบริหารวิชาการ": return "badge-academic";
        case "งานบริหารงบประมาณ": return "badge-budget";
        case "งานบริหารบุคลากร": return "badge-personnel";
        case "งานบริหารทั่วไป": return "badge-general";
        default: return "badge-default";
    }
};

const Loader = () => (
    <div className="loader-overlay">
        <div className="loader"></div>
    </div>
);

// MemoModal COMPONENT
const MemoModal = ({ isOpen, onClose, onSave, memoToEdit, departments, onAddDepartment }) => {
    const [formData, setFormData] = useState<Partial<Memo>>({});
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [newDepartment, setNewDepartment] = useState('');

    useEffect(() => {
        if (memoToEdit) {
            setFormData(memoToEdit);
            setFile(null);
        } else {
            setFormData({ date: new Date().toISOString().split('T')[0] });
            setFile(null);
        }
    }, [memoToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (selectedFile) => {
        if (selectedFile) {
            setFile(selectedFile);
        }
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };
    
    const handleDragEvents = (e, over) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(over);
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        let fileData;
        if (file) {
            const dataUrl = await fileToBase64(file);
            fileData = { name: file.name, dataUrl };
        } else if (memoToEdit?.file) {
            fileData = memoToEdit.file;
        }

        const memoToSave = {
            ...formData,
            id: memoToEdit ? memoToEdit.id : crypto.randomUUID(),
            file: fileData
        };
        onSave(memoToSave);
    };

    const handleAddDepartment = () => {
        if (newDepartment && !departments.includes(newDepartment)) {
            onAddDepartment(newDepartment);
            setFormData(prev => ({...prev, department: newDepartment}));
            setNewDepartment('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{memoToEdit ? 'แก้ไขบันทึกข้อความ' : 'เพิ่มบันทึกข้อความใหม่'}</h2>
                    <button className="btn-icon" onClick={onClose} aria-label="Close modal"><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                         <div className="form-group">
                            <label htmlFor="memoNumber">เลขที่บันทึกข้อความ</label>
                            <input type="text" id="memoNumber" name="memoNumber" value={formData.memoNumber || ''} onChange={handleChange} required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="date">วันที่</label>
                            <input type="date" id="date" name="date" value={formData.date || ''} onChange={handleChange} required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="teacher">ชื่อครูผู้ดำเนินการ</label>
                            <input type="text" id="teacher" name="teacher" value={formData.teacher || ''} onChange={handleChange} required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="subject">เรื่อง</label>
                            <input type="text" id="subject" name="subject" value={formData.subject || ''} onChange={handleChange} required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="department">ฝ่ายงาน</label>
                            <select id="department" name="department" value={formData.department || ''} onChange={handleChange} required>
                                <option value="">เลือกฝ่ายงาน</option>
                                {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{flexDirection: 'row', gap: '0.5rem', alignItems: 'center'}}>
                            <input type="text" placeholder="เพิ่มฝ่ายงานใหม่" value={newDepartment} onChange={e => setNewDepartment(e.target.value)} style={{flexGrow: 1}} />
                            <button type="button" className="btn btn-secondary" onClick={handleAddDepartment} style={{flexShrink: 0}}>เพิ่ม</button>
                        </div>
                        <div 
                            className={`drop-zone ${isDragging ? 'drag-over' : ''}`}
                            onDrop={handleDrop}
                            onDragOver={e => handleDragEvents(e, true)}
                            onDragEnter={e => handleDragEvents(e, true)}
                            onDragLeave={e => handleDragEvents(e, false)}
                            onClick={() => document.getElementById('file-upload').click()}
                        >
                            <p>ลากและวางไฟล์ที่นี่ หรือคลิกเพื่ออัปโหลด</p>
                            <input type="file" id="file-upload" onChange={e => handleFileChange(e.target.files[0])} style={{ display: 'none' }} />
                            {(file || formData.file) && (
                                <p className="file-info">{file?.name || formData.file?.name}</p>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={onClose} style={{backgroundColor: 'var(--medium-gray)'}}>ยกเลิก</button>
                        <button type="submit" className="btn btn-primary">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// MAIN PAGE
const MainPage = ({ setView, memos, departments, saveMemos, saveDepartments }) => {
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memoToEdit, setMemoToEdit] = useState<Memo | null>(null);
    const [filters, setFilters] = useState({ subject: '', teacher: '', startDate: '', endDate: '', department: '' });
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleSaveMemo = (memo: Memo) => {
        setLoading(true);
        setTimeout(() => {
            const newMemos = memoToEdit 
                ? memos.map(m => m.id === memo.id ? memo : m)
                : [...memos, memo];
            saveMemos(newMemos);
            setIsModalOpen(false);
            setMemoToEdit(null);
            setLoading(false);
            Swal.fire({
                title: 'สำเร็จ!',
                text: `บันทึกข้อมูลเรียบร้อยแล้ว`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            });
        }, 500);
    };

    const handleDeleteMemo = (id: string) => {
        Swal.fire({
            title: 'แน่ใจหรือไม่?',
            text: "คุณต้องการลบข้อมูลนี้ใช่หรือไม่!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            cancelButtonColor: 'var(--danger-color)',
            confirmButtonText: 'ใช่, ลบเลย!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                setLoading(true);
                setTimeout(() => {
                    const newMemos = memos.filter(m => m.id !== id);
                    saveMemos(newMemos);
                    setLoading(false);
                    Swal.fire('ลบแล้ว!', 'ข้อมูลของคุณถูกลบเรียบร้อยแล้ว', 'success');
                }, 500);
            }
        });
    };
    
    const handleAddDepartment = (newDepartment) => {
        const newDepartments = [...departments, newDepartment];
        saveDepartments(newDepartments);
        Swal.fire('สำเร็จ', 'เพิ่มฝ่ายงานใหม่เรียบร้อย', 'success');
    };

    const filteredMemos = useMemo(() => {
        let filtered = [...memos];
        if (filters.subject) {
            filtered = filtered.filter(m => m.subject.toLowerCase().includes(filters.subject.toLowerCase()));
        }
        if (filters.teacher) {
            filtered = filtered.filter(m => m.teacher === filters.teacher);
        }
        if (filters.department) {
            filtered = filtered.filter(m => m.department === filters.department);
        }
        if (filters.startDate) {
            const start = startOfDay(parseISO(filters.startDate));
            filtered = filtered.filter(m => parseISO(m.date) >= start);
        }
        if (filters.endDate) {
            const end = endOfDay(parseISO(filters.endDate));
            filtered = filtered.filter(m => parseISO(m.date) <= end);
        }
        return filtered;
    }, [memos, filters]);

    const sortedMemos = useMemo(() => {
        let sortableMemos = [...filteredMemos];
        if (sortConfig !== null) {
            sortableMemos.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableMemos;
    }, [filteredMemos, sortConfig]);

    const paginatedMemos = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedMemos.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedMemos, currentPage]);
    
    const totalPages = Math.ceil(sortedMemos.length / itemsPerPage);
    
    const requestSort = (key: keyof Memo) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof Memo) => {
        if (!sortConfig || sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    const uniqueTeachers = useMemo(() => [...new Set(memos.map(m => m.teacher))], [memos]);
    
    const dashboardStats = useMemo(() => {
        const counts = { total: filteredMemos.length };
        departments.forEach(dep => {
            counts[dep] = filteredMemos.filter(m => m.department === dep).length;
        });
        return counts;
    }, [filteredMemos, departments]);

    const getCardClass = (department) => {
        switch (department) {
            case "งานบริหารวิชาการ": return "card-academic";
            case "งานบริหารงบประมาณ": return "card-budget";
            case "งานบริหารบุคลากร": return "card-personnel";
            case "งานบริหารทั่วไป": return "card-general";
            default: return "";
        }
    };
    
    return (
        <>
            {loading && <Loader />}
            <MemoModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setMemoToEdit(null); }}
                onSave={handleSaveMemo}
                memoToEdit={memoToEdit}
                departments={departments}
                onAddDepartment={handleAddDepartment}
            />
            <header className="app-header">
                <div className="container header-content">
                    <h1>ทะเบียนคุมบันทึกข้อความ</h1>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => setView('stats')}><ChartIcon /> ดูสถิติ</button>
                        <button className="btn btn-primary" onClick={() => { setMemoToEdit(null); setIsModalOpen(true); }}><PlusIcon /> เพิ่มบันทึกใหม่</button>
                    </div>
                </div>
            </header>
            <main className="main-content container">
                <section className="dashboard">
                    <div className="dashboard-card card-total"><h3>ทะเบียนทั้งหมด</h3><p>{dashboardStats.total}</p></div>
                    {departments.map(dep => (
                         <div key={dep} className={`dashboard-card ${getCardClass(dep)}`}><h3>{dep}</h3><p>{dashboardStats[dep]}</p></div>
                    ))}
                </section>
                <section className="filters-card">
                    <div className="filters-grid">
                        <div className="form-group"><label>ค้นหาชื่อเรื่อง</label><input type="text" value={filters.subject} onChange={e => setFilters({...filters, subject: e.target.value})} /></div>
                        <div className="form-group"><label>ชื่อครู</label><select value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value})}><option value="">ทั้งหมด</option>{uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                        <div className="form-group"><label>ฝ่ายงาน</label><select value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})}><option value="">ทั้งหมด</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div className="form-group"><label>วันที่เริ่มต้น</label><input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} /></div>
                        <div className="form-group"><label>วันที่สิ้นสุด</label><input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} /></div>
                    </div>
                </section>
                <section className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ลำดับ</th>
                                <th onClick={() => requestSort('memoNumber')} className={sortConfig?.key === 'memoNumber' ? 'sorted' : ''}>เลขที่บันทึก <span className="sort-icon">{getSortIndicator('memoNumber')}</span></th>
                                <th onClick={() => requestSort('date')} className={sortConfig?.key === 'date' ? 'sorted' : ''}>วันที่ <span className="sort-icon">{getSortIndicator('date')}</span></th>
                                <th onClick={() => requestSort('teacher')} className={sortConfig?.key === 'teacher' ? 'sorted' : ''}>ชื่อครู <span className="sort-icon">{getSortIndicator('teacher')}</span></th>
                                <th onClick={() => requestSort('subject')} className={sortConfig?.key === 'subject' ? 'sorted' : ''}>เรื่อง <span className="sort-icon">{getSortIndicator('subject')}</span></th>
                                <th onClick={() => requestSort('department')} className={sortConfig?.key === 'department' ? 'sorted' : ''}>ฝ่ายงาน <span className="sort-icon">{getSortIndicator('department')}</span></th>
                                <th>ไฟล์</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedMemos.length > 0 ? paginatedMemos.map((memo, index) => (
                                <tr key={memo.id}>
                                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td>{memo.memoNumber}</td>
                                    <td>{format(parseISO(memo.date), 'dd/MM/yyyy')}</td>
                                    <td><span className={`badge ${getBadgeColor(memo.department)}`}>{memo.teacher}</span></td>
                                    <td>{memo.subject}</td>
                                    <td><span className={`badge ${getBadgeColor(memo.department)}`}>{memo.department}</span></td>
                                    <td>{memo.file ? <a href={memo.file.dataUrl} target="_blank" rel="noopener noreferrer">เปิดไฟล์</a> : '-'}</td>
                                    <td className="table-actions">
                                        <button className="btn-icon" onClick={() => { setMemoToEdit(memo); setIsModalOpen(true); }}><EditIcon /></button>
                                        <button className="btn-icon" onClick={() => handleDeleteMemo(memo.id)}><DeleteIcon /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="empty-state">ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                      <div className="pagination">
                          <span>หน้า {currentPage} จาก {totalPages}</span>
                          <div>
                              <button className="btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>ก่อนหน้า</button>
                              <button className="btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{marginLeft: '0.5rem'}}>ถัดไป</button>
                          </div>
                      </div>
                    )}
                </section>
            </main>
        </>
    );
};

// STATS PAGE
const StatsPage = ({ setView, memos, departments }) => {
    const barChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const [timeFilter, setTimeFilter] = useState('month');

    const createChart = (ctx, type, data, options) => new Chart(ctx, { type, data, options });

    const departmentData = useMemo(() => {
        const data = departments.map(dep => memos.filter(m => m.department === dep).length);
        return {
            labels: departments,
            datasets: [{
                label: 'จำนวนบันทึกข้อความ',
                data,
                backgroundColor: ['#0288D1', '#F57C00', '#D32F2F', '#FBC02D', '#71717a'],
            }]
        };
    }, [memos, departments]);

    const timelineData = useMemo(() => {
        const now = new Date();
        let interval, dateFormat;
        switch(timeFilter) {
            case 'day':
                interval = { start: startOfWeek(now), end: endOfWeek(now) };
                dateFormat = 'EEEE'; // e.g., Monday
                break;
            case 'week':
                interval = { start: startOfYear(now), end: endOfYear(now) };
                dateFormat = "'Week' w"; // e.g., Week 23
                break;
            case 'year':
                interval = { start: startOfYear(subYears(now, 5)), end: endOfYear(now) };
                dateFormat = 'yyyy';
                break;
            case 'month':
            default:
                interval = { start: startOfYear(now), end: endOfYear(now) };
                dateFormat = 'MMMM'; // e.g., January
                break;
        }

        let labels, groupedData;

        const datePoints = memos.map(m => parseISO(m.date));

        if (timeFilter === 'day') {
            labels = eachDayOfInterval(interval).map(d => format(d, dateFormat));
            groupedData = labels.map(label => datePoints.filter(d => format(d, dateFormat) === label).length);
        } else if (timeFilter === 'week') {
            labels = eachWeekOfInterval(interval).map(d => format(d, dateFormat));
            groupedData = labels.map(label => datePoints.filter(d => format(d, dateFormat) === label).length);
        } else if (timeFilter === 'month') {
             labels = eachMonthOfInterval(interval).map(d => format(d, dateFormat));
             groupedData = labels.map(label => datePoints.filter(d => format(d, dateFormat) === label).length);
        } else { // year
             labels = eachYearOfInterval(interval).map(d => format(d, dateFormat));
             groupedData = labels.map(label => datePoints.filter(d => format(d, dateFormat) === label).length);
        }

        return {
            labels,
            datasets: [{
                label: 'จำนวนบันทึกข้อความ',
                data: groupedData,
                borderColor: '#4A2C6D',
                backgroundColor: 'rgba(74, 44, 109, 0.2)',
                fill: true,
                tension: 0.3
            }]
        };
    }, [memos, timeFilter]);

    useEffect(() => {
        const barCtx = barChartRef.current.getContext('2d');
        const lineCtx = lineChartRef.current.getContext('2d');

        const barChart = createChart(barCtx, 'bar', departmentData, { responsive: true, plugins: { legend: { display: false } } });
        const lineChart = createChart(lineCtx, 'line', timelineData, { responsive: true, plugins: { legend: { display: false } } });
        
        return () => {
            barChart.destroy();
            lineChart.destroy();
        };
    }, [departmentData, timelineData]);

    return (
        <>
            <header className="app-header">
                <div className="container header-content">
                    <h1>สถิติภาพรวม</h1>
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => setView('main')}><BackIcon /> กลับหน้าแรก</button>
                    </div>
                </div>
            </header>
            <main className="main-content container">
                <div className="stats-grid">
                    <div className="chart-container">
                        <h3>จำนวนแต่ละฝ่ายงาน</h3>
                        <canvas ref={barChartRef}></canvas>
                    </div>
                    <div className="chart-container">
                        <div className="stats-header">
                            <h3>สถิติตามช่วงเวลา</h3>
                            <div className="form-group">
                                <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                                    <option value="day">รายวัน</option>
                                    <option value="week">รายสัปดาห์</option>
                                    <option value="month">รายเดือน</option>
                                    <option value="year">รายปี</option>
                                </select>
                            </div>
                        </div>
                        <canvas ref={lineChartRef}></canvas>
                    </div>
                </div>
            </main>
        </>
    );
};


// APP COMPONENT
const App = () => {
    const [view, setView] = useState<View>('main');
    const [memos, setMemos] = useState<Memo[]>(() => getFromStorage<Memo[]>('memos', []));
    const [departments, setDepartments] = useState<Department[]>(() => getFromStorage<Department[]>('departments', DEFAULT_DEPARTMENTS));

    const saveMemos = useCallback((newMemos: Memo[]) => {
        setMemos(newMemos);
        saveToStorage('memos', newMemos);
    }, []);

    const saveDepartments = useCallback((newDepartments: Department[]) => {
        setDepartments(newDepartments);
        saveToStorage('departments', newDepartments);
    }, []);
    
    return (
      <>
          {view === 'main' ? (
              <MainPage 
                  setView={setView} 
                  memos={memos} 
                  departments={departments}
                  saveMemos={saveMemos}
                  saveDepartments={saveDepartments}
              />
          ) : (
              <StatsPage 
                  setView={setView} 
                  memos={memos} 
                  departments={departments}
              />
          )}
          <footer className="app-footer">
              ทะเบียนคุมบันทึกข้อความ โรงเรียนบ้านเสยเสย
          </footer>
      </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
