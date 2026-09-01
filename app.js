let menu=[],cart=[];

async function loadMenu(){
  const r=await fetch("/api/menu");
  menu=await r.json();
  renderMenu();
}
function renderMenu(){
  const el=document.getElementById("menuGrid");
  el.innerHTML=menu.map(x=>`
    <article class="card">
      <div class="pic">${x.emoji}</div>
      <div class="body">
        <h3>${x.name}</h3>
        <p>${x.desc}</p>
        <div class="bottom">
          <span class="price">${x.price.toLocaleString()} บาท</span>
          <button class="add" onclick="add(${x.id})">+ เพิ่ม</button>
        </div>
      </div>
    </article>`).join("");
}
function add(id){
  const p=menu.find(x=>x.id===id);
  const old=cart.find(x=>x.id===id);
  if(old) old.quantity++;
  else cart.push({...p,quantity:1});
  updateCart();
  openCart();
}
function remove(id){
  cart=cart.filter(x=>x.id!==id);
  updateCart();
}
function updateCart(){
  document.getElementById("count").textContent=cart.reduce((s,x)=>s+x.quantity,0);
  const el=document.getElementById("cartItems");
  el.innerHTML=cart.length?cart.map(x=>`
    <div class="item">
      <div><b>${x.name}</b><p>${x.price} บาท × ${x.quantity}</p></div>
      <button class="remove" onclick="remove(${x.id})">ลบ</button>
    </div>`).join(""):"<p style='text-align:center;color:#777;padding:35px'>ยังไม่มีสินค้าในตะกร้า</p>";
  document.getElementById("total").textContent=cart.reduce((s,x)=>s+x.price*x.quantity,0).toLocaleString();
}
function openCart(){document.getElementById("cartModal").style.display="flex"}
function closeCart(){document.getElementById("cartModal").style.display="none"}
function showCheckout(){
  if(!cart.length){alert("กรุณาเลือกอาหารก่อน");return}
  closeCart();document.getElementById("checkoutModal").style.display="flex";
}
function closeCheckout(){document.getElementById("checkoutModal").style.display="none"}
document.getElementById("orderForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={
    customer_name:document.getElementById("name").value,
    phone:document.getElementById("phone").value,
    order_type:document.getElementById("type").value,
    address:document.getElementById("address").value,
    note:document.getElementById("note").value,
    items:cart.map(x=>({id:x.id,name:x.name,price:x.price,quantity:x.quantity}))
  };
  const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await r.json();
  if(!r.ok){alert(data.error||"เกิดข้อผิดพลาด");return}
  document.getElementById("result").innerHTML=`✅ รับออเดอร์แล้ว<br>เลขที่ออเดอร์ <b>#${data.order_id}</b><br>ยอดรวม ${data.total.toLocaleString()} บาท<br><a href="/tracking.html" style="display:inline-block;margin-top:12px;color:#e85d04">📦 ติดตามรายการของฉัน</a>`;
  cart=[];updateCart();e.target.reset();
});
loadMenu();updateCart();