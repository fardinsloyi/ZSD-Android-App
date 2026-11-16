import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const API = 'https://zsdcp.ir/wp-json/wc/store/v1';
const SITE = 'https://zsdcp.ir';
const state = { page: 1, perPage: 12, category: 0, search: '', products: [], loading: false, hasMore: true };
const $ = (id) => document.getElementById(id);
const productsEl = $('products'), categoriesEl = $('categories');

function money(product) {
  const p = product.prices || {};
  const minor = Number(p.currency_minor_unit ?? 0);
  const value = Number(p.price ?? 0) / Math.pow(10, minor);
  return new Intl.NumberFormat('fa-IR').format(value) + ' ' + (p.currency_code === 'IRR' ? 'ریال' : (p.currency_code || ''));
}
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2300);
}
async function openUrl(url) {
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.location.href = url;
}
function productCard(p) {
  const image = p.images?.[0]?.src || '';
  const stock = p.is_in_stock ? '<span class="stock">موجود</span>' : '<span class="stock out">ناموجود</span>';
  const safeName = (p.name || '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  return `<article class="product-card">
    <div class="product-image">${image ? `<img loading="lazy" src="${image}" alt="${safeName}">` : '<span class="no-image">Z</span>'}${stock}</div>
    <div class="product-info"><div class="product-name">${safeName}</div>
      <div class="product-bottom"><div class="price">${money(p)}<small> </small></div>
      <button class="buy-btn" data-url="${encodeURIComponent(p.permalink)}">جزئیات و خرید</button></div>
    </div></article>`;
}
async function loadProducts(reset = false) {
  if (state.loading || (!state.hasMore && !reset)) return;
  state.loading = true;
  if (reset) { state.page = 1; state.products = []; state.hasMore = true; productsEl.innerHTML = ''; }
  const params = new URLSearchParams({ per_page: String(state.perPage), page: String(state.page), orderby: 'date', order: 'desc' });
  if (state.category) params.set('category', String(state.category));
  if (state.search) params.set('search', state.search);
  try {
    const res = await fetch(`${API}/products?${params.toString()}`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('خطا در دریافت محصولات');
    const data = await res.json();
    state.products.push(...data);
    productsEl.innerHTML = state.products.map(productCard).join('');
    state.hasMore = data.length === state.perPage;
    state.page++;
    $('loadMore').hidden = !state.hasMore;
    $('emptyState').hidden = state.products.length !== 0;
  } catch (e) {
    if (!state.products.length) productsEl.innerHTML = `<div class="empty">${e.message}؛ اتصال اینترنت را بررسی کن.</div>`;
    toast('دریافت محصولات ناموفق بود');
  } finally { state.loading = false; }
}
async function loadCategories() {
  try {
    const res = await fetch(`${API}/products/categories?per_page=100&hide_empty=true`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const cats = data.filter(c => c.parent === 0);
    categoriesEl.innerHTML = `<button class="category-chip active" data-cat="0">همه محصولات</button>` +
      cats.map(c => `<button class="category-chip" data-cat="${c.id}">${c.name}</button>`).join('');
  } catch { categoriesEl.innerHTML = '<button class="category-chip active" data-cat="0">همه محصولات</button>'; }
}
categoriesEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-cat]'); if (!btn) return;
  state.category = Number(btn.dataset.cat);
  categoriesEl.querySelectorAll('.category-chip').forEach(x => x.classList.toggle('active', x === btn));
  $('productsTitle').textContent = btn.textContent;
  loadProducts(true);
  $('productsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
productsEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-url]'); if (!btn) return;
  openUrl(decodeURIComponent(btn.dataset.url));
});
$('loadMore').addEventListener('click', () => loadProducts());
$('browseBtn').addEventListener('click', () => $('productsSection').scrollIntoView({ behavior: 'smooth' }));
$('allCategories').addEventListener('click', () => {
  state.category = 0;
  categoriesEl.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('active', x.dataset.cat === '0'));
  $('productsTitle').textContent = 'محصولات فروشگاه'; loadProducts(true);
});
let searchTimer;
$('searchInput').addEventListener('input', e => {
  clearTimeout(searchTimer); state.search = e.target.value.trim();
  searchTimer = setTimeout(() => loadProducts(true), 400);
});
$('clearSearch').addEventListener('click', () => { $('searchInput').value = ''; state.search = ''; loadProducts(true); });
$('accountBtn').addEventListener('click', () => openUrl(`${SITE}/my-account/`));
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x === btn));
  const tab = btn.dataset.tab;
  if (tab === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tab === 'categories') $('categories').scrollIntoView({ behavior: 'smooth' });
  if (tab === 'orders') openUrl(`${SITE}/my-account/orders/`);
  if (tab === 'account') openUrl(`${SITE}/my-account/`);
}));
loadCategories();
loadProducts(true);
