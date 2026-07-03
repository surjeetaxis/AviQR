// Offline fallback data — used when backend is unreachable

export const MOCK_STATS = {
  totalRevenue: 24680, totalOrders: 73, avgOrderValue: 338, newCustomers: 12,
};

export const MOCK_REVENUE = [
  { date:'May 17', revenue:12400, orders:38 },
  { date:'May 18', revenue:14200, orders:42 },
  { date:'May 19', revenue:11800, orders:35 },
  { date:'May 20', revenue:16500, orders:51 },
  { date:'May 21', revenue:22300, orders:68 },
  { date:'May 22', revenue:28100, orders:84 },
  { date:'May 23', revenue:24600, orders:73 },
];

export const MOCK_ORDERS = [
  { id:'o1', orderNumber:'ORD-2847', customerName:'Walk-in', tableNumber:'7',  totalAmount:720,  status:'NEW',       items:[{itemName:'Paneer Butter Masala',quantity:1,unitPrice:320},{itemName:'Butter Naan',quantity:2,unitPrice:55}], createdAt:new Date(Date.now()-120000).toISOString() },
  { id:'o2', orderNumber:'ORD-2846', customerName:'Anjali',  tableNumber:'12', totalAmount:480,  status:'PREPARING', items:[{itemName:'Butter Chicken',quantity:1,unitPrice:380},{itemName:'Garlic Naan',quantity:2,unitPrice:65}],       createdAt:new Date(Date.now()-300000).toISOString() },
  { id:'o3', orderNumber:'ORD-2845', customerName:'Rohit',   tableNumber:'3',  totalAmount:1240, status:'PREPARING', items:[{itemName:'Dal Makhani',quantity:2,unitPrice:280},{itemName:'Chicken Biryani',quantity:1,unitPrice:360}],     createdAt:new Date(Date.now()-720000).toISOString() },
  { id:'o4', orderNumber:'ORD-2844', customerName:'Priya',   tableNumber:null, totalAmount:590,  status:'READY',     items:[{itemName:'Sweet Lassi',quantity:3,unitPrice:80},{itemName:'Paneer Tikka',quantity:1,unitPrice:280}],          createdAt:new Date(Date.now()-840000).toISOString() },
  { id:'o5', orderNumber:'ORD-2843', customerName:'Karan',   tableNumber:'9',  totalAmount:980,  status:'COMPLETED', items:[{itemName:'Gulab Jamun',quantity:2,unitPrice:90}],                                                             createdAt:new Date(Date.now()-1320000).toISOString() },
];

export const MOCK_CATEGORIES = [
  { id:'c1', name:'Starters',    emoji:'🥗', shopId:'shop1' },
  { id:'c2', name:'Main Course', emoji:'🍛', shopId:'shop1' },
  { id:'c3', name:'Breads',      emoji:'🫓', shopId:'shop1' },
  { id:'c4', name:'Beverages',   emoji:'🥤', shopId:'shop1' },
  { id:'c5', name:'Desserts',    emoji:'🍮', shopId:'shop1' },
];

export const MOCK_ITEMS = [
  { id:'i1', name:'Paneer Tikka',       categoryId:'c1', price:280, veg:true,  spicy:false, popular:true,  available:true,  description:'Marinated cottage cheese grilled in tandoor' },
  { id:'i2', name:'Chicken Tikka',      categoryId:'c1', price:320, veg:false, spicy:true,  popular:false, available:true,  description:'Tender chicken char-grilled with spices' },
  { id:'i3', name:'Paneer Butter Masala',categoryId:'c2',price:320, veg:true,  spicy:false, popular:true,  available:true,  description:'Rich creamy tomato-cashew gravy with paneer' },
  { id:'i4', name:'Dal Makhani',        categoryId:'c2', price:280, veg:true,  spicy:false, popular:true,  available:true,  description:'Black lentils slow-cooked in butter and cream' },
  { id:'i5', name:'Butter Chicken',     categoryId:'c2', price:380, veg:false, spicy:false, popular:true,  available:true,  description:'Tender chicken in velvety tomato-butter sauce' },
  { id:'i6', name:'Butter Naan',        categoryId:'c3', price:55,  veg:true,  spicy:false, popular:false, available:true,  description:'Soft leavened bread baked in tandoor' },
  { id:'i7', name:'Garlic Naan',        categoryId:'c3', price:65,  veg:true,  spicy:false, popular:false, available:true,  description:'Naan topped with fresh garlic and coriander' },
  { id:'i8', name:'Sweet Lassi',        categoryId:'c4', price:80,  veg:true,  spicy:false, popular:false, available:true,  description:'Chilled yoghurt drink with rose water' },
  { id:'i9', name:'Masala Chai',        categoryId:'c4', price:40,  veg:true,  spicy:false, popular:false, available:true,  description:'Freshly brewed spiced Indian tea' },
  { id:'i10',name:'Gulab Jamun (2 pcs)',categoryId:'c5', price:90,  veg:true,  spicy:false, popular:false, available:true,  description:'Milk-solid dumplings in rose syrup' },
];

export const MOCK_MENU = {
  shopName: 'Spice Route',
  categories: [
    { ...MOCK_CATEGORIES[0], items: MOCK_ITEMS.filter(i => i.categoryId === 'c1').map(i => ({ ...i, effectivePrice: i.price })) },
    { ...MOCK_CATEGORIES[1], items: MOCK_ITEMS.filter(i => i.categoryId === 'c2').map(i => ({ ...i, effectivePrice: i.price })) },
    { ...MOCK_CATEGORIES[2], items: MOCK_ITEMS.filter(i => i.categoryId === 'c3').map(i => ({ ...i, effectivePrice: i.price })) },
    { ...MOCK_CATEGORIES[3], items: MOCK_ITEMS.filter(i => i.categoryId === 'c4').map(i => ({ ...i, effectivePrice: i.price })) },
    { ...MOCK_CATEGORIES[4], items: MOCK_ITEMS.filter(i => i.categoryId === 'c5').map(i => ({ ...i, effectivePrice: i.price })) },
  ],
};

export const MOCK_STAFF = [
  { id:'s1', name:'Vikram Sharma',  role:'MANAGER', phone:'9900112233', email:'vikram@gmail.com',      active:true, avatar:'VS' },
  { id:'s2', name:'Chef Rangan',    role:'KITCHEN',  phone:'9845012346', email:'kitchen@spiceroute.in', active:true, avatar:'CR' },
  { id:'s3', name:'Deepa Cashier',  role:'CASHIER',  phone:'9845012347', email:'cashier@spiceroute.in', active:true, avatar:'DC' },
];

export const MOCK_QR_CODES = [
  { id:'q1', qrCode:'spiceroute',    targetUrl:'https://aviqr.in/menu/shop1',            label:'Main Shop QR', type:'SHOP',  scanCount:2841 },
  { id:'q2', qrCode:'spiceroute-t4', targetUrl:'https://aviqr.in/menu/shop1?table=4',    label:'Table 4',      type:'TABLE', scanCount:421 },
  { id:'q3', qrCode:'spiceroute-t7', targetUrl:'https://aviqr.in/menu/shop1?table=7',    label:'Table 7',      type:'TABLE', scanCount:284 },
];

export const MOCK_TOP_ITEMS = [
  { name:'Paneer Butter Masala', qty:142, revenue:45440 },
  { name:'Butter Chicken',       qty:128, revenue:48640 },
  { name:'Dal Makhani',          qty:106, revenue:29680 },
  { name:'Chicken Biryani',      qty:98,  revenue:35280 },
  { name:'Butter Naan',          qty:286, revenue:15730 },
];

export const MOCK_HOTEL_DATA = {
  hotel: { id:'h1', name:'Grand Palace Hotel', city:'Chennai', totalRooms:120, checkInTime:'14:00', checkOutTime:'12:00' },
  rooms: [
    { id:'r1', roomNumber:'101', roomType:'Standard',    floor:'1st', status:'OCCUPIED',    guestName:'Anjali Singh',  checkInDate:'Jun 15', checkOutDate:'Jun 17' },
    { id:'r2', roomNumber:'102', roomType:'Standard',    floor:'1st', status:'VACANT',      guestName:null },
    { id:'r3', roomNumber:'103', roomType:'Standard',    floor:'1st', status:'MAINTENANCE', guestName:null },
    { id:'r4', roomNumber:'201', roomType:'Deluxe',      floor:'2nd', status:'OCCUPIED',    guestName:'Ravi Kumar',    checkInDate:'Jun 13', checkOutDate:'Jun 18' },
    { id:'r5', roomNumber:'202', roomType:'Deluxe',      floor:'2nd', status:'VACANT',      guestName:null },
    { id:'r6', roomNumber:'301', roomType:'Suite',       floor:'3rd', status:'OCCUPIED',    guestName:'Meena Pillai',  checkInDate:'Jun 14', checkOutDate:'Jun 20' },
    { id:'r7', roomNumber:'302', roomType:'Suite',       floor:'3rd', status:'VACANT',      guestName:null },
    { id:'r8', roomNumber:'401', roomType:'Presidential',floor:'4th', status:'VACANT',      guestName:null },
  ],
  requests: [
    { id:'req1', roomNumber:'101', serviceType:'ROOM_SERVICE', description:'Club Sandwich + Fresh Lime Soda',              status:'NEW',       priority:'HIGH',   createdAt:new Date(Date.now()-300000).toISOString() },
    { id:'req2', roomNumber:'201', serviceType:'LAUNDRY',      description:'2 shirts, 1 trouser (express)',                 status:'PREPARING', priority:'NORMAL', createdAt:new Date(Date.now()-720000).toISOString() },
    { id:'req3', roomNumber:'301', serviceType:'MAINTENANCE',  description:'AC not cooling — stuck at 28 degrees',         status:'PREPARING', priority:'HIGH',   createdAt:new Date(Date.now()-1200000).toISOString() },
    { id:'req4', roomNumber:'101', serviceType:'SPA',          description:'60-min Swedish Massage at 3 PM',               status:'CONFIRMED', priority:'NORMAL', createdAt:new Date(Date.now()-2100000).toISOString() },
    { id:'req5', roomNumber:'201', serviceType:'ROOM_SERVICE', description:'Breakfast for 2 — continental set',            status:'DONE',      priority:'NORMAL', createdAt:new Date(Date.now()-7200000).toISOString() },
  ],
};

export const MOCK_MALL_DATA = {
  mall: { id:'m1', name:'Forum Mall Bengaluru', city:'Bengaluru', commissionPercent:10 },
  vendors: [
    { id:'v1', name:'Spice Route',      category:'North Indian', floor:'F1', contact:'9845012345', active:true },
    { id:'v2', name:'Wok to Walk',      category:'Chinese',      floor:'F1', contact:'9876501234', active:true },
    { id:'v3', name:'Burger Republic',  category:'Fast Food',    floor:'F2', contact:'9112345678', active:true },
    { id:'v4', name:'Rolls Corner',     category:'Kathi Rolls',  floor:'F1', contact:'9988000001', active:false },
    { id:'v5', name:'Ice Cream Palace', category:'Desserts',     floor:'F2', contact:'9000112233', active:true },
    { id:'v6', name:'South Spice',      category:'South Indian', floor:'F2', contact:'9876509876', active:true },
  ],
};

export const MOCK_TICKETS = [
  { id:'t1', ticketNumber:'TKT-10001', userName:'Sujeet Narayanan', userRole:'OWNER',    subject:'QR code not scanning on Android phones',      priority:'HIGH',   status:'OPEN',     createdAt:new Date(Date.now()-7200000).toISOString() },
  { id:'t2', ticketNumber:'TKT-10002', userName:'Meena Pillai',     userRole:'OWNER',    subject:'Payment stuck in PENDING for 2 hours',        priority:'URGENT', status:'PENDING',  createdAt:new Date(Date.now()-10800000).toISOString() },
  { id:'t3', ticketNumber:'TKT-10003', userName:'Grand Palace Hotel',userRole:'HOTEL',   subject:'Room service menu not loading for guests',     priority:'HIGH',   status:'OPEN',     createdAt:new Date(Date.now()-18000000).toISOString() },
  { id:'t4', ticketNumber:'TKT-10004', userName:'Sujeet Narayanan', userRole:'OWNER',    subject:'How to bulk upload menu via Excel?',           priority:'LOW',    status:'RESOLVED', createdAt:new Date(Date.now()-86400000).toISOString() },
  { id:'t5', ticketNumber:'TKT-10005', userName:'Anjali Singh',     userRole:'CUSTOMER', subject:'Order placed but restaurant says no record',   priority:'HIGH',   status:'RESOLVED', createdAt:new Date(Date.now()-172800000).toISOString() },
  { id:'t6', ticketNumber:'TKT-10006', userName:'Forum Mall Admin', userRole:'MALL',     subject:'Commission report shows wrong percentage',     priority:'MEDIUM', status:'OPEN',     createdAt:new Date(Date.now()-21600000).toISOString() },
  { id:'t7', ticketNumber:'TKT-10007', userName:'Farhan Khan',      userRole:'OWNER',    subject:'Account suspended without notice',             priority:'URGENT', status:'PENDING',  createdAt:new Date(Date.now()-14400000).toISOString() },
];

export const MOCK_ADMIN_STATS = {
  totalShops: 5, totalOrders: 2216, totalRevenue: 842680, totalHotels: 3,
  totalMalls: 3, totalUsers: 32, activeShops: 4, newUsersToday: 3,
};
