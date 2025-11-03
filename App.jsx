
import React, { useEffect, useState } from 'react';

function isoDate(d) {
  const dt = new Date(d);
  return dt.toISOString().slice(0,10);
}

const STORAGE_KEY = 'ql_vattu_demo_items_v1';
const USER_KEY = 'ql_vattu_demo_user_v1';

const minStyles = `
:root{--bg:#f0f7ff;--card:#fff;--muted:#6b7280;--accent:#0b69ff}
*{box-sizing:border-box}
body{font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; margin:0; background:var(--bg); color:#0f172a}
.app{max-width:980px;margin:18px auto;padding:16px}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.title{font-size:20px;font-weight:700;display:flex;gap:8px;align-items:center}
.controls{display:flex;gap:8px;align-items:center}
.search{padding:8px 10px;border-radius:8px;border:1px solid #e6eefc}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.card{background:var(--card);padding:12px;border-radius:12px;box-shadow:0 1px 2px rgba(2,6,23,0.06)}
.card img{width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px}
.field{font-size:13px;color:var(--muted)}
.btn{padding:8px 10px;border-radius:8px;border:0;background:var(--accent);color:white;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #e6eefc;color:#0f172a}
.form{background:var(--card);padding:12px;border-radius:12px;margin-bottom:12px}
.input,textarea,select{padding:8px;border-radius:8px;border:1px solid #e6eefc;width:100%}
.small{font-size:13px;color:var(--muted)}
.footer{margin-top:18px;text-align:center;color:var(--muted);font-size:13px}

/* login modal */
.loginWrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.4);z-index:60}
.loginBox{width:320px;background:var(--card);padding:18px;border-radius:12px;box-shadow:0 6px 24px rgba(2,6,23,0.2)}
`;


export default function App(){
  const [items,setItems] = useState([]);
  const [search,setSearch] = useState('');
  const [user,setUser] = useState(null);
  const [form,setForm] = useState(emptyForm());
  const [editingId,setEditingId] = useState(null);

  useEffect(()=>{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) setItems(JSON.parse(raw));
    const u = localStorage.getItem(USER_KEY);
    if(u) setUser(JSON.parse(u));
  },[]);

  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },[items]);

  function emptyForm(){
    return { name:'', quantity:'', unit:'', location:'', notes:'', image:'', date: isoDate(new Date()) };
  }

  function handleAddOrUpdate(e){
    e?.preventDefault();
    if(!user) return alert('Vui lòng đăng nhập trước khi thêm vật tư.');
    if(!form.name) return alert('Nhập tên vật tư');
    const payload = { ...form, quantity: Number(form.quantity||0), user: user.name || user.email, date: form.date || isoDate(new Date()) };
    if(editingId){
      setItems(prev => prev.map(it => it.id === editingId ? ({ ...it, ...payload }) : it));
      setEditingId(null);
    } else {
      const id = 'local_' + Date.now();
      setItems(prev => [{ id, ...payload }, ...prev]);
    }
    setForm(emptyForm());
  }

  function startEdit(it){
    setEditingId(it.id);
    setForm({ name: it.name, quantity: it.quantity, unit: it.unit, location: it.location, notes: it.notes||'', image: it.image||'', date: it.date||isoDate(new Date()) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removeItem(id){
    if(!confirm('Xác nhận xoá vật tư này?')) return;
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function onUploadImage(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(f);
  }

  async function exportExcel(){
    try {
      const XLSX = await import('xlsx');
      const wsData = [['Tên vật tư','Số lượng','Đơn vị','Vị trí','Người nhập','Ngày','Ghi chú']];
      const filtered = items.filter(it => it.name.toLowerCase().includes(search.toLowerCase())).map(it => [it.name, it.quantity, it.unit, it.location, it.user, it.date, it.notes||'']);
      wsData.push(...filtered);
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vattu');
      const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vattu_export_' + new Date().toISOString().slice(0,10) + '.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch(e){
      alert('Lỗi xuất Excel. Đảm bảo đã cài thư viện xlsx khi chạy trên máy: npm install xlsx');
      console.error(e);
    }
  }

  function handleLogout(){
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  function handleLogin(name, email){
    const u = { name: name || email, email: email || name };
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }

  const list = items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app">
      <style>{minStyles}</style>
      <div className="header">
        <div className="title">🏗️ QL Vật Tư Công Trình (Demo)</div>
        <div className="controls">
          <input className="search" placeholder="Tìm vật tư..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn" onClick={exportExcel}>📤 Xuất Excel</button>
        </div>
      </div>

      <div className="form">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontWeight:700}}>Form thêm / chỉnh sửa</div>
          <div style={{fontSize:13,color:'#6b7280'}}>
            Người dùng hiện tại: <strong>{user ? (user.name || user.email) : 'chưa đăng nhập'}</strong>
            {user && <button style={{marginLeft:10}} className="btn ghost" onClick={handleLogout}>Đăng xuất</button>}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <input className="input" placeholder="Tên vật tư" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <input className="input" placeholder="Số lượng" type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} />
          <input className="input" placeholder="Đơn vị (ví dụ: Bao, cây)" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} />
          <input className="input" placeholder="Vị trí công trình" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />
          <input className="input" placeholder="Ngày (YYYY-MM-DD)" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
          <input className="input" placeholder="Ghi chú" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
        </div>

        <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center'}}>
          <input type="file" accept="image/*" onChange={onUploadImage} />
          <button className="btn" onClick={handleAddOrUpdate}>{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
          {editingId && <button className="btn ghost" onClick={()=>{setEditingId(null);setForm(emptyForm())}}>Huỷ</button>}
        </div>

        <div style={{marginTop:8}} className="small">Lưu ý: Đây là bản demo. Dữ liệu lưu trong trình duyệt (localStorage). Nếu muốn lưu lên đám mây, bạn có thể nâng cấp sau.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
        <div style={{flex:1}}>
          <input className="input" placeholder="Tìm theo email / người nhập (demo)" value={''} readOnly />
        </div>
        <div style={{display:'flex',gap:8}}>
          {!user && <button className="btn" onClick={()=>{ document.getElementById('loginBtn')?.click(); }}>Đăng nhập</button>}
        </div>
      </div>

      <div className="grid">
        {list.map(it=>(
          <div className="card" key={it.id}>
            {it.image ? <img src={it.image} alt="img" /> : <div style={{height:110,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af'}}>Hình trống</div>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
              <div>
                <div style={{fontWeight:700}}>{it.name}</div>
                <div className="field">Số lượng: <strong>{it.quantity}</strong> {it.unit}</div>
                <div className="field">Vị trí: {it.location}</div>
                <div className="field">Người nhập: {it.user}</div>
                <div className="field">Ngày: {it.date}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <button className="btn ghost" onClick={()=>startEdit(it)}>Sửa</button>
                <button className="btn" onClick={()=>removeItem(it.id)}>Xoá</button>
              </div>
            </div>
            {it.notes && <div style={{marginTop:8,fontSize:13,color:'#374151'}}>Ghi chú: {it.notes}</div>}
          </div>
        ))}
      </div>

      <div className="footer">Demo PWA — Mọi người có quyền như nhau.</div>

      {/* Hidden login panel triggered by button */}
      <input type="checkbox" id="loginBtn" style={{display:'none'}} />
      <LoginModal onLogin={handleLogin} />
    </div>
  );
}

/* Simple LoginModal component */
function LoginModal({ onLogin }){
  const [open, setOpen] = useState(false);
  useEffect(()=> {
    const cb = (e) => {
      const chk = document.getElementById('loginBtn');
      setOpen(!!chk && chk.checked);
    };
    document.addEventListener('change', cb);
    cb();
    return ()=> document.removeEventListener('change', cb);
  },[]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  function doLogin(){
    if(!name && !email) return alert('Nhập tên hoặc email để đăng nhập (demo)');
    onLogin(name, email);
    // close modal
    const chk = document.getElementById('loginBtn');
    if(chk) { chk.checked = false; }
    setOpen(false);
  }
  if(!open) return null;
  return (
    <div className="loginWrap" onClick={()=>{ const chk = document.getElementById('loginBtn'); if(chk){ chk.checked=false; setOpen(false);} }}>
      <div className="loginBox" onClick={(e)=>e.stopPropagation()}>
        <h3>Đăng nhập (nhẹ)</h3>
        <div style={{marginTop:8}}>
          <input className="input" placeholder="Tên (ví dụ: Tuấn)" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div style={{marginTop:8}}>
          <input className="input" placeholder="Email (tùy chọn)" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,justifyContent:'flex-end'}}>
          <button className="btn ghost" onClick={()=>{ const chk = document.getElementById('loginBtn'); if(chk){ chk.checked=false; setOpen(false);} }}>Huỷ</button>
          <button className="btn" onClick={doLogin}>Đăng nhập</button>
        </div>
        <div style={{marginTop:8}} className="small">Lưu ý: Đây là đăng nhập nhẹ cho demo — không có mật khẩu. Dữ liệu lưu trên thiết bị.</div>
      </div>
    </div>
  );
}
