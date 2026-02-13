// مصفوفة لتخزين البيانات
let transactions = JSON.parse(localStorage.getItem('debtTransactions')) || [];

// حفظ البيانات
function saveToLocal() {
    localStorage.setItem('debtTransactions', JSON.stringify(transactions));
}

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('transDate').valueAsDate = new Date();
    renderGeneralLedger();
});

// --- 1. منطق التبويبات (APP TABS) ---
function switchTab(tabId) {
    // إخفاء كل المحتويات
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // إزالة التنشيط من كل الأزرار
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // تفعيل التبويب المختار
    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById(tabId).classList.add('active');
    
    // تفعيل الزر المطابق
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
    if(activeBtn) activeBtn.classList.add('active');

    // تحديث البيانات حسب التبويب
    if(tabId === 'generalTab') renderGeneralLedger();
    if(tabId === 'customersTab') renderCustomerList();
}

// --- 2. إدارة العمليات (إضافة / تعديل) ---
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const id = document.getElementById('editTransactionId').value;
    const name = document.getElementById('customerName').value.trim();
    const type = document.getElementById('transType').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('transDate').value;
    
    // الحقول الجديدة
    const itemName = document.getElementById('itemName').value.trim();
    const itemCount = document.getElementById('itemCount').value;
    const itemDetails = document.getElementById('itemDetails').value.trim();

    if (!name || isNaN(amount) || amount <= 0) {
        alert("يرجى إدخال الاسم والمبلغ بشكل صحيح");
        return;
    }

    const transactionData = {
        id: id ? parseInt(id) : Date.now(),
        date: date,
        name: name,
        type: type,
        amount: amount,
        itemName: itemName,    // المادة
        itemCount: itemCount,  // العدد
        itemDetails: itemDetails // ملاحظات
    };

    if (id) {
        // تعديل عملية موجودة
        const index = transactions.findIndex(t => t.id == id);
        if(index !== -1) transactions[index] = transactionData;
        alert("تم تعديل العملية بنجاح");
        cancelEditMode(); // الخروج من وضع التعديل
    } else {
        // إضافة عملية جديدة
        transactions.push(transactionData);
        alert("تمت الإضافة بنجاح");
        this.reset();
        document.getElementById('transDate').valueAsDate = new Date();
    }

    saveToLocal();
    renderGeneralLedger();
    
    // إذا كان هناك بحث نشط، نحدث الكشف
    const activeSearch = document.getElementById('statementCustomerName').innerText;
    if(activeSearch !== '---' && name === activeSearch) {
        searchCustomer(name);
    }
});

// --- 3. البحث وكشف الحساب ---
function searchCustomer(forceName = null) {
    const searchName = forceName || document.getElementById('searchInput').value.trim();
    
    if (!searchName) {
        alert("يرجى كتابة اسم الزبون");
        return;
    }

    // عرض قسم الكشف
    document.getElementById('customerStatementSection').classList.remove('hidden');
    document.getElementById('statementCustomerName').innerText = searchName;

    const customerTrans = transactions
        .filter(t => t.name.toLowerCase() === searchName.toLowerCase()) // مطابقة دقيقة للاسم
        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);

    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';

    let runningBalance = 0;

    if (customerTrans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد حركات لهذا الزبون</td></tr>';
    } else {
        customerTrans.forEach(t => {
            // حساب الرصيد التراكمي
            // القيم التي تزيد الدين: payment (مدين/سحب) و settle_credit (تسديد دائن/دفعنا له لتقليل دينه علينا)
            // القيم التي تنقص الدين: debt (دائن/يطلبنا) و settle_debt (تسديد مدين/دفع لنا)
            
            if (t.type === 'debt' || t.type === 'settle_debt') {
                runningBalance -= t.amount;
            } else {
                runningBalance += t.amount;
            }

            const row = document.createElement('tr');
            
            // تحديد النصوص والألوان بناءً على النوع الجديد
            let typeText = '';
            let typeClass = '';

            switch(t.type) {
                case 'payment':
                    typeText = 'مدين (عليه)';
                    typeClass = 'text-red';
                    break;
                case 'debt':
                    typeText = 'دائن (له)';
                    typeClass = 'text-green';
                    break;
                case 'settle_debt':
                    typeText = 'تسديد (واصل)';
                    typeClass = 'text-green';
                    break;
                case 'settle_credit':
                    typeText = 'تسديد (مصروف)';
                    typeClass = 'text-red';
                    break;
                default:
                    typeText = '---';
                    typeClass = 'text-neutral';
            }
            
            // دمج اسم المادة والملاحظات
            let notesText = t.itemDetails || '-';
            if (t.itemName) {
                notesText = `${t.itemName} ${t.itemCount ? '(' + t.itemCount + ')' : ''} - ${notesText}`;
            }
            if (notesText === '-') notesText = t.itemName || '-';

            // أزرار التعديل والحذف
            row.innerHTML = `
                <td>${t.date}</td>
                <td>${t.name}</td>
                <td class="${typeClass}">${typeText}</td>
                <td>${formatMoney(t.amount)}</td>
                <td>${notesText}</td>
                <td>
                    <button class="btn-small btn-edit" onclick="editTransaction(${t.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-small btn-delete" onclick="deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    const finalDisplay = document.getElementById('finalBalanceDisplay');
    finalDisplay.innerText = formatMoney(runningBalance);
    // إذا كان الرصيد موجب (أحمر) يعني هو مطلوب، إذا سالب (أخضر) يعني هو يطلبنا
    finalDisplay.style.color = runningBalance > 0 ? '#ff5252' : (runningBalance < 0 ? '#4caf50' : '#fff');
}

// --- 4. وظيفة عرض قائمة الزبائن (زر حذف فقط) ---
function renderCustomerList() {
    const tbody = document.getElementById('customersListBody');
    tbody.innerHTML = '';

    // استخراج أسماء الزبائن الفريدة
    const uniqueCustomers = [...new Set(transactions.map(t => t.name))].sort();

    if (uniqueCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">لا يوجد زبائن مسجلين</td></tr>';
    } else {
        uniqueCustomers.forEach((name, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td style="font-weight:bold;">${name}</td>
                <td>
                    <button class="btn-small btn-delete" style="width:auto; display:inline-block;" onclick="deleteCustomerAll('${name}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// --- 5. وظائف إدارة الزبائن الجديدة ---

function renameCustomer(oldName) {
    const newName = prompt("أدخل الاسم الجديد للزبون:", oldName);
    if(newName && newName.trim() !== "" && newName !== oldName) {
        // تحديث كل العمليات المرتبطة بهذا الاسم
        let updatedCount = 0;
        transactions.forEach(t => {
            if(t.name === oldName) {
                t.name = newName.trim();
                updatedCount++;
            }
        });
        saveToLocal();
        alert(`تم تعديل اسم الزبون بنجاح في ${updatedCount} عملية.`);
        renderCustomerList();
        renderGeneralLedger();
        
        // إذا كان هناك بحث نشط بنفس الاسم القديم، نحدثه
        if(document.getElementById('statementCustomerName').innerText === oldName) {
             document.getElementById('searchInput').value = newName.trim();
             searchCustomer(newName.trim());
        }
    }
}

function deleteCustomerAll(name) {
    if(confirm(`تحذير هام!\nهل أنت متأكد من حذف الزبون "${name}" وكافة ديونه وسجلاته نهائياً؟\nلا يمكن التراجع عن هذا الإجراء.`)) {
        transactions = transactions.filter(t => t.name !== name);
        saveToLocal();
        renderCustomerList();
        renderGeneralLedger();
        
        // إخفاء الكشف إذا كان معروضاً لنفس الزبون
        if(document.getElementById('statementCustomerName').innerText === name) {
            document.getElementById('customerStatementSection').classList.add('hidden');
            document.getElementById('statementCustomerName').innerText = "---";
        }
    }
}

// --- 6. إجراءات الحذف والتعديل (للعمليات الفردية) ---

function deleteTransaction(id) {
    if(confirm("هل أنت متأكد من حذف هذه العملية؟ لا يمكن التراجع.")) {
        transactions = transactions.filter(t => t.id !== id);
        saveToLocal();
        // تحديث العرض الحالي
        const currentName = document.getElementById('statementCustomerName').innerText;
        if(currentName !== '---') searchCustomer(currentName);
        renderGeneralLedger();
    }
}

function editTransaction(id) {
    const t = transactions.find(trans => trans.id === id);
    if (!t) return;

    // تعبئة النموذج بالبيانات
    document.getElementById('editTransactionId').value = t.id;
    document.getElementById('customerName').value = t.name;
    document.getElementById('transType').value = t.type;
    document.getElementById('amount').value = t.amount;
    document.getElementById('transDate').value = t.date;
    document.getElementById('itemName').value = t.itemName || '';
    document.getElementById('itemCount').value = t.itemCount || '';
    document.getElementById('itemDetails').value = t.itemDetails || '';

    // تغيير حالة الزر والنصوص
    document.getElementById('saveBtn').innerText = "حفظ التعديلات";
    document.getElementById('cancelEditBtn').classList.remove('hidden');

    // الانتقال لتبويب الإضافة
    switchTab('addTab');
}

function cancelEditMode() {
    document.getElementById('transactionForm').reset();
    document.getElementById('editTransactionId').value = '';
    document.getElementById('saveBtn').innerText = "حفظ العملية";
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('transDate').valueAsDate = new Date();
}

function prepareQuickAction(type) {
    const name = document.getElementById('statementCustomerName').innerText;
    if(name === '---') return;

    cancelEditMode(); // التأكد من عدم وجود تعديل معلق
    document.getElementById('customerName').value = name;
    
    // تحديد نوع العملية في القائمة بناءً على الزر المضغوط
    document.getElementById('transType').value = type;
    
    switchTab('addTab');
}

// --- 7. السجل العام ---
function renderGeneralLedger() {
    const tbody = document.getElementById('generalTableBody');
    tbody.innerHTML = '';
    const sortedTrans = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

    sortedTrans.slice(0, 50).forEach((t, index) => { // عرض آخر 50 فقط للأداء
        const row = document.createElement('tr');
        
        let typeText = '';
        let typeClass = '';
        
        // منطق عرض الأنواع في السجل العام
        switch(t.type) {
            case 'payment': typeText = 'مدين'; typeClass = 'text-red'; break;
            case 'debt': typeText = 'دائن'; typeClass = 'text-green'; break;
            case 'settle_debt': typeText = 'تسديد واصل'; typeClass = 'text-green'; break;
            case 'settle_credit': typeText = 'تسديد مصروف'; typeClass = 'text-red'; break;
            default: typeText = '-';
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${t.name}</td>
            <td class="${typeClass}">${typeText}</td>
            <td>${formatMoney(t.amount)}</td>
            <td>${t.itemName || '-'}</td>
            <td>
                <button class="btn-small btn-edit" onclick="editTransaction(${t.id})"><i class="fas fa-pen"></i></button>
                <button class="btn-small btn-delete" onclick="deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button>
                <button class="btn-glass" style="padding: 2px 8px; font-size: 0.8em;" onclick="performSearch('${t.name}')">كشف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function performSearch(name) {
    document.getElementById('searchInput').value = name;
    switchTab('searchTab');
    searchCustomer(name);
}

function formatMoney(amount) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
