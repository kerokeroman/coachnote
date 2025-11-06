// 저장소 키
const STORAGE_KEY = 'coachNote';
const TEMP_STORAGE_KEY = 'coachNoteTempSave';

// 저장 상태 추적 변수
let isSaved = false;

// 요소 가져오기
let resetBtn, saveBtn, editBtn, exportPdfBtn, notification, autoSaveStatus;

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    // 요소 가져오기
    resetBtn = document.getElementById('resetBtn');
    saveBtn = document.getElementById('saveBtn');
    editBtn = document.getElementById('editBtn');
    exportPdfBtn = document.getElementById('exportPdfBtn');
    notification = document.getElementById('notification');
    autoSaveStatus = document.getElementById('autoSaveStatus');

    // 정식 저장 데이터가 있으면 불러오기
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData) {
        // 정식 저장된 데이터 불러오기 (읽기 전용)
        loadData(STORAGE_KEY);
        lockAllEditableFields();
        isSaved = true;
    } else {
        // 임시저장 데이터가 있으면 불러오기 (수정 가능)
        loadData(TEMP_STORAGE_KEY);

        // 처음에는 안내 메시지 표시
        if (!document.getElementById('question').innerHTML.trim()) {
            autoSaveStatus.textContent = '작성중인 내용은 30초마다 자동저장 됩니다';
        }
    }

    // 모든 editable 요소에 이벤트 리스너 추가
    addInitialEventListeners();

    // 초기화 버튼
    resetBtn.addEventListener('click', () => {
        if (confirm('모든 내용을 초기화하시겠습니까?\n작업 내용은 되돌릴 수 없습니다.')) {
            // 모든 텍스트 필드 초기화
            document.getElementById('question').innerHTML = '';
            document.getElementById('analysis').innerHTML = '';
            document.getElementById('improvement').innerHTML = '';
            document.getElementById('coachNote').innerHTML = '';

            // 테이블 완전히 초기화 - 모든 행 삭제 후 새로 생성
            const programTable = document.getElementById('programTable');
            const programRows = programTable.querySelectorAll('.table-row');

            // 모든 행 삭제
            programRows.forEach(row => row.remove());

            // 새로운 첫 번째 행 생성
            const newRow = document.createElement('div');
            newRow.className = 'table-row';
            newRow.innerHTML = `
                <div class="col-day">
                    <select class="day-select" data-day-index="0">
                        <option value="">-</option>
                        <option value="1일차">1일차</option>
                        <option value="2일차">2일차</option>
                        <option value="3일차">3일차</option>
                        <option value="4일차">4일차</option>
                        <option value="5일차">5일차</option>
                        <option value="6일차">6일차</option>
                        <option value="7일차">7일차</option>
                    </select>
                </div>
                <div class="col-exercise"><div class="editable" contenteditable="true" data-placeholder="운동 내용 입력"></div></div>
                <div class="col-reps"><div class="editable" contenteditable="true" data-placeholder="횟수"></div></div>
                <div class="col-sets"><div class="editable" contenteditable="true" data-placeholder="세트"></div></div>
                <div class="col-purpose"><div class="editable" contenteditable="true" data-placeholder="운동의 목적이나 달성할 목표를 입력하세요"></div></div>
            `;

            programTable.appendChild(newRow);

            // 새로운 행에 이벤트 리스너 추가
            newRow.querySelectorAll('.editable').forEach(editable => {
                editable.addEventListener('input', updatePlaceholders);
                editable.addEventListener('paste', () => {
                    setTimeout(updatePlaceholders, 10);
                });
                editable.addEventListener('input', autoSave);
                updatePlaceholders();
            });

            newRow.querySelector('.col-day .day-select').addEventListener('change', autoSave);

            // 로컬 스토리지 삭제
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TEMP_STORAGE_KEY);

            // 저장 상태 초기화
            isSaved = false;

            // 잠금 해제
            unlockAllEditableFields();

            // 안내 메시지 표시
            autoSaveStatus.textContent = '작성중인 내용은 30초마다 자동저장 됩니다';

            // 코치님 한마디 안내문구 표시
            document.getElementById('coachGuideText').style.display = 'block';

            showNotification('모든 내용이 초기화되었습니다.');
        }
    });

    // 저장 버튼
    saveBtn.addEventListener('click', () => {
        const data = collectData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // 임시저장 데이터 삭제
        localStorage.removeItem(TEMP_STORAGE_KEY);

        // 저장 상태 업데이트
        isSaved = true;

        // 모든 편집 가능한 요소를 읽기 전용으로 변경
        lockAllEditableFields();

        // 데스크톱에서만 같은 일차끼리 병합하여 표시
        if (window.innerWidth > 768) {
            mergeTableRowsByDay();
        } else {
            // 모바일에서는 병합하지 않고 순서만 정렬
            sortTableRowsByDay();
        }

        // 자동저장 표시 비우기
        autoSaveStatus.textContent = '';

        showNotification('저장되었습니다!');
    });

    // 수정하기 버튼
    editBtn.addEventListener('click', () => {
        // 병합된 행들을 원래 형태로 복원
        unmergeTableRows();
        unlockAllEditableFields();
    });

    // 행 추가 버튼 이벤트
    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            addTableRow();
            autoSave();
        });
    }

    // 행 삭제 버튼 이벤트
    const deleteRowBtn = document.getElementById('deleteRowBtn');
    if (deleteRowBtn) {
        deleteRowBtn.addEventListener('click', () => {
            deleteTableRow();
            autoSave();
        });
    }

    // PDF 출력 버튼
    exportPdfBtn.addEventListener('click', () => {
        // 포커스된 요소 해제
        document.activeElement.blur();

        // 저장 여부 확인
        if (!isSaved) {
            alert('저장을 먼저 해주세요!\nPDF 출력은 저장 후 가능합니다.');
            return;
        }

        const element = document.querySelector('.container');
        const buttonGroup = document.querySelector('.button-group');
        const autoSaveIndicator = document.querySelector('.auto-save-indicator');

        // 버튼과 알림 임시로 숨기기
        const originalButtonDisplay = buttonGroup.style.display;
        const originalAutoSaveDisplay = autoSaveIndicator.style.display;
        const originalNotificationDisplay = notification.style.display;
        buttonGroup.style.display = 'none';
        autoSaveIndicator.style.display = 'none';
        notification.style.display = 'none';

        showNotification('PDF 생성 중...');

        // PDF 옵션 설정
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `코치노트_${new Date().toLocaleDateString('ko-KR')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                logging: false
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        // PDF 생성
        html2pdf().set(opt).from(element).save().then(() => {
            // 원래 상태로 복원
            buttonGroup.style.display = originalButtonDisplay;
            autoSaveIndicator.style.display = originalAutoSaveDisplay;
            notification.style.display = originalNotificationDisplay;
            showNotification('PDF가 생성되었습니다!');
        }).catch(err => {
            // 원래 상태로 복원
            buttonGroup.style.display = originalButtonDisplay;
            autoSaveIndicator.style.display = originalAutoSaveDisplay;
            notification.style.display = originalNotificationDisplay;
            showNotification('PDF 생성 중 오류가 발생했습니다.');
            console.error(err);
        });
    });

    // 초기 자동저장 시작
    startAutoSave();
});

// 알림 표시 함수
function showNotification(message, duration = 3000) {
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// 데이터 수집 함수
function collectData() {
    const data = {
        question: document.getElementById('question').innerHTML,
        analysis: document.getElementById('analysis').innerHTML,
        improvement: document.getElementById('improvement').innerHTML,
        coachNote: document.getElementById('coachNote').innerHTML,
        program: []
    };

    const programRows = document.querySelectorAll('#programTable .table-row');
    programRows.forEach(row => {
        const daySelect = row.querySelector('.col-day .day-select');
        const day = daySelect ? daySelect.value : '';
        const exercise = row.querySelector('.col-exercise .editable').innerHTML;
        const reps = row.querySelector('.col-reps .editable').innerHTML;
        const sets = row.querySelector('.col-sets .editable').innerHTML;
        const purpose = row.querySelector('.col-purpose .editable').innerHTML;

        data.program.push({ day, exercise, reps, sets, purpose });
    });

    return data;
}

// 데이터 불러오기 함수
function loadData(storageKey) {
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
        const data = JSON.parse(savedData);

        document.getElementById('question').innerHTML = data.question || '';
        document.getElementById('analysis').innerHTML = data.analysis || '';
        document.getElementById('improvement').innerHTML = data.improvement || '';
        document.getElementById('coachNote').innerHTML = data.coachNote || '';

        // 프로그램 데이터가 있으면 행을 추가하고 채우기
        const programTable = document.getElementById('programTable');
        if (data.program && data.program.length > 1) {
            // 첫 번째 행은 이미 있으므로, 추가 행만 생성
            for (let i = 1; i < data.program.length; i++) {
                addTableRowWithoutListeners();
            }

            // 데이터 채우기
            const rows = programTable.querySelectorAll('.table-row');
            data.program.forEach((item, index) => {
                if (rows[index]) {
                    const daySelect = rows[index].querySelector('.col-day .day-select');
                    if (daySelect) {
                        daySelect.value = item.day || '';
                    }
                    rows[index].querySelector('.col-exercise .editable').innerHTML = item.exercise || '';
                    rows[index].querySelector('.col-reps .editable').innerHTML = item.reps || '';
                    rows[index].querySelector('.col-sets .editable').innerHTML = item.sets || '';
                    rows[index].querySelector('.col-purpose .editable').innerHTML = item.purpose || '';
                }
            });
        }
    }
}

// 로드 중에 사용하는 행 추가 함수 (이벤트 리스너 없음)
function addTableRowWithoutListeners() {
    const programTable = document.getElementById('programTable');
    const existingRows = programTable.querySelectorAll('.table-row');
    const rowIndex = existingRows.length;

    const newRow = document.createElement('div');
    newRow.className = 'table-row';
    newRow.innerHTML = `
        <div class="col-day">
            <select class="day-select" data-day-index="${rowIndex}">
                <option value="">-</option>
                <option value="1일차">1일차</option>
                <option value="2일차">2일차</option>
                <option value="3일차">3일차</option>
                <option value="4일차">4일차</option>
                <option value="5일차">5일차</option>
                <option value="6일차">6일차</option>
                <option value="7일차">7일차</option>
            </select>
        </div>
        <div class="col-exercise"><div class="editable" contenteditable="true" data-placeholder="운동 내용 입력"></div></div>
        <div class="col-reps"><div class="editable" contenteditable="true" data-placeholder="횟수"></div></div>
        <div class="col-sets"><div class="editable" contenteditable="true" data-placeholder="세트"></div></div>
        <div class="col-purpose"><div class="editable" contenteditable="true" data-placeholder="운동의 목적이나 달성할 목표를 입력하세요"></div></div>
    `;

    programTable.appendChild(newRow);
}

// 테이블 행 추가 함수
function addTableRow() {
    const programTable = document.getElementById('programTable');
    const existingRows = programTable.querySelectorAll('.table-row');
    const rowIndex = existingRows.length;

    const newRow = document.createElement('div');
    newRow.className = 'table-row';
    newRow.innerHTML = `
        <div class="col-day">
            <select class="day-select" data-day-index="${rowIndex}">
                <option value="">-</option>
                <option value="1일차">1일차</option>
                <option value="2일차">2일차</option>
                <option value="3일차">3일차</option>
                <option value="4일차">4일차</option>
                <option value="5일차">5일차</option>
                <option value="6일차">6일차</option>
                <option value="7일차">7일차</option>
            </select>
        </div>
        <div class="col-exercise"><div class="editable" contenteditable="true" data-placeholder="운동 내용 입력"></div></div>
        <div class="col-reps"><div class="editable" contenteditable="true" data-placeholder="횟수"></div></div>
        <div class="col-sets"><div class="editable" contenteditable="true" data-placeholder="세트"></div></div>
        <div class="col-purpose"><div class="editable" contenteditable="true" data-placeholder="운동의 목적이나 달성할 목표를 입력하세요"></div></div>
    `;

    programTable.appendChild(newRow);

    // 새로 추가된 요소들에 이벤트 리스너 추가
    newRow.querySelectorAll('.editable').forEach(editable => {
        editable.addEventListener('input', updatePlaceholders);
        editable.addEventListener('paste', () => {
            setTimeout(updatePlaceholders, 10);
        });
        editable.addEventListener('input', autoSave);
        updatePlaceholders();
    });

    newRow.querySelector('.col-day .day-select').addEventListener('change', autoSave);
}

// 테이블 행 삭제 함수 (마지막 행만 삭제)
function deleteTableRow() {
    const programTable = document.getElementById('programTable');
    const rows = programTable.querySelectorAll('.table-row');

    // 행이 1개 이상 있을 때만 삭제
    if (rows.length > 1) {
        if (confirm('마지막 행을 삭제하시겠습니까?')) {
            rows[rows.length - 1].remove();
        }
    } else {
        showNotification('최소 1개 행은 유지되어야 합니다.');
    }
}

// 초기 이벤트 리스너 추가 함수
function addInitialEventListeners() {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(editable => {
        editable.addEventListener('input', updatePlaceholders);
        editable.addEventListener('paste', () => {
            setTimeout(updatePlaceholders, 10);
        });
        editable.addEventListener('input', autoSave);
        updatePlaceholders();
    });

    document.querySelectorAll('.day-select').forEach(select => {
        select.addEventListener('change', autoSave);
    });
}

// 자동저장 함수
function autoSave() {
    const data = collectData();
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(data));

    // 자동저장 표시 업데이트
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    autoSaveStatus.textContent = `임시저장됨: ${timeString}`;
}

// 모바일에서 사용하는 일차별 정렬 함수 (병합 없음)
function sortTableRowsByDay() {
    const programTable = document.getElementById('programTable');
    const rows = Array.from(programTable.querySelectorAll('.table-row'));

    // 일차별로 그룹화
    const groupedByDay = {};
    const emptyKey = '__empty__';

    rows.forEach((row) => {
        const daySelect = row.querySelector('.col-day .day-select');
        const day = daySelect ? daySelect.value : '';
        const key = day || emptyKey;

        if (!groupedByDay[key]) {
            groupedByDay[key] = [];
        }
        groupedByDay[key].push({
            day: day,
            exercise: row.querySelector('.col-exercise .editable').innerHTML,
            reps: row.querySelector('.col-reps .editable').innerHTML,
            sets: row.querySelector('.col-sets .editable').innerHTML,
            purpose: row.querySelector('.col-purpose .editable').innerHTML
        });
    });

    // 새로운 행으로 재구성 (병합 없음)
    const newRows = [];
    const dayOrder = ['1일차', '2일차', '3일차', '4일차', '5일차', '6일차', '7일차'];

    // 선택된 일차들 먼저 처리
    dayOrder.forEach(day => {
        if (groupedByDay[day]) {
            groupedByDay[day].forEach((item) => {
                const newRow = document.createElement('div');
                newRow.className = 'table-row merged-row';

                newRow.innerHTML = `
                    <div class="col-day">
                        <div class="day-label">${day}</div>
                    </div>
                    <div class="col-exercise"><div class="editable locked" contenteditable="false">${item.exercise}</div></div>
                    <div class="col-reps"><div class="editable locked" contenteditable="false">${item.reps}</div></div>
                    <div class="col-sets"><div class="editable locked" contenteditable="false">${item.sets}</div></div>
                    <div class="col-purpose"><div class="editable locked" contenteditable="false">${item.purpose}</div></div>
                `;

                newRows.push(newRow);
            });
        }
    });

    // 선택하지 않은 항목들 마지막에 처리
    if (groupedByDay[emptyKey]) {
        groupedByDay[emptyKey].forEach((item) => {
            const newRow = document.createElement('div');
            newRow.className = 'table-row merged-row';

            newRow.innerHTML = `
                <div class="col-day">
                    <div class="day-label empty-day-label">-</div>
                </div>
                <div class="col-exercise"><div class="editable locked" contenteditable="false">${item.exercise}</div></div>
                <div class="col-reps"><div class="editable locked" contenteditable="false">${item.reps}</div></div>
                <div class="col-sets"><div class="editable locked" contenteditable="false">${item.sets}</div></div>
                <div class="col-purpose"><div class="editable locked" contenteditable="false">${item.purpose}</div></div>
            `;

            newRows.push(newRow);
        });
    }

    // 기존 행들을 새로운 행으로 교체
    rows.forEach(row => row.remove());
    newRows.forEach(row => programTable.appendChild(row));
}

// 같은 일차끼리 병합하여 표시하는 함수
function mergeTableRowsByDay() {
    const programTable = document.getElementById('programTable');
    const rows = Array.from(programTable.querySelectorAll('.table-row'));

    // 일차별로 그룹화 (선택하지 않은 항목도 포함)
    const groupedByDay = {};
    const emptyKey = '__empty__'; // 선택하지 않은 항목들을 위한 키

    rows.forEach((row, index) => {
        const daySelect = row.querySelector('.col-day .day-select');
        const day = daySelect ? daySelect.value : '';
        const key = day || emptyKey;

        if (!groupedByDay[key]) {
            groupedByDay[key] = [];
        }
        groupedByDay[key].push({
            index,
            row,
            day: day,
            exercise: row.querySelector('.col-exercise .editable').innerHTML,
            reps: row.querySelector('.col-reps .editable').innerHTML,
            sets: row.querySelector('.col-sets .editable').innerHTML,
            purpose: row.querySelector('.col-purpose .editable').innerHTML
        });
    });

    // 새로운 행으로 재구성
    const newRows = [];
    const dayOrder = ['1일차', '2일차', '3일차', '4일차', '5일차', '6일차', '7일차'];

    // 선택된 일차들 먼저 처리
    dayOrder.forEach(day => {
        if (groupedByDay[day]) {
            groupedByDay[day].forEach((item, itemIndex) => {
                const newRow = document.createElement('div');
                newRow.className = 'table-row merged-row';

                // 첫 번째 항목만 일차를 표시
                if (itemIndex === 0) {
                    newRow.innerHTML = `
                        <div class="col-day">
                            <div class="day-label">${day}</div>
                        </div>
                        <div class="col-exercise"><div class="editable locked" contenteditable="false">${item.exercise}</div></div>
                        <div class="col-reps"><div class="editable locked" contenteditable="false">${item.reps}</div></div>
                        <div class="col-sets"><div class="editable locked" contenteditable="false">${item.sets}</div></div>
                        <div class="col-purpose"><div class="editable locked" contenteditable="false">${item.purpose}</div></div>
                    `;
                } else {
                    // 같은 일차의 추가 항목들은 일차 셀을 병합 표시
                    newRow.innerHTML = `
                        <div class="col-day">
                            <div class="day-label-merged"></div>
                        </div>
                        <div class="col-exercise"><div class="editable locked" contenteditable="false">${item.exercise}</div></div>
                        <div class="col-reps"><div class="editable locked" contenteditable="false">${item.reps}</div></div>
                        <div class="col-sets"><div class="editable locked" contenteditable="false">${item.sets}</div></div>
                        <div class="col-purpose"><div class="editable locked" contenteditable="false">${item.purpose}</div></div>
                    `;
                }

                newRows.push(newRow);
            });
        }
    });

    // 선택하지 않은 항목들 (빈 일차) 마지막에 처리
    if (groupedByDay[emptyKey]) {
        groupedByDay[emptyKey].forEach((item, itemIndex) => {
            const newRow = document.createElement('div');
            newRow.className = 'table-row merged-row';

            // 첫 번째 빈 항목만 라벨 표시
            if (itemIndex === 0) {
                newRow.innerHTML = `
                    <div class="col-day">
                        <div class="day-label empty-day-label">-</div>
                    </div>
                    <div class="col-exercise"><div class="editable locked" contenteditable="false">${item.exercise}</div></div>
                    <div class="col-reps"><div class="editable locked" contenteditable="false">${item.reps}</div></div>
                    <div class="col-sets"><div class="editable locked" contenteditable="false">${item.sets}</div></div>
                    <div class="col-purpose"><div class="editable locked" contenteditable="false">${item.purpose}</div></div>
                `;
            } else {
                // 같은 그룹의 추가 항목들은 일차 셀을 병합 표시
                newRow.innerHTML = `
                    <div class="col-day">
                        <div class="day-label-merged"></div>
                    </div>
                    <div class="col-exercise"><div class="editable locked" contenteditable="false">${item.exercise}</div></div>
                    <div class="col-reps"><div class="editable locked" contenteditable="false">${item.reps}</div></div>
                    <div class="col-sets"><div class="editable locked" contenteditable="false">${item.sets}</div></div>
                    <div class="col-purpose"><div class="editable locked" contenteditable="false">${item.purpose}</div></div>
                `;
            }

            newRows.push(newRow);
        });
    }

    // 기존 행들을 새로운 행으로 교체
    rows.forEach(row => row.remove());
    newRows.forEach(row => programTable.appendChild(row));
}

// 편집 가능한 필드를 잠금
function lockAllEditableFields() {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(editable => {
        editable.contentEditable = 'false';
        editable.classList.add('locked');
        // 저장 상태에서는 placeholder 숨기기
        editable.classList.remove('empty-placeholder');
    });

    // 버튼 상태 변경
    saveBtn.style.display = 'none';
    editBtn.style.display = 'inline-block';

    // 행 추가/삭제 버튼 숨기기
    const addRowBtn = document.getElementById('addRowBtn');
    const deleteRowBtn = document.getElementById('deleteRowBtn');
    if (addRowBtn) {
        addRowBtn.style.display = 'none';
    }
    if (deleteRowBtn) {
        deleteRowBtn.style.display = 'none';
    }

    // 코치님 한마디 안내문구 숨기기
    document.getElementById('coachGuideText').style.display = 'none';
}

// 편집 가능한 필드를 잠금 해제
function unlockAllEditableFields() {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(editable => {
        editable.contentEditable = 'true';
        editable.classList.remove('locked');
        // 수정 모드에서는 placeholder 다시 활성화
        updatePlaceholders();
    });

    // 저장 상태 초기화 (수정 모드로 돌아가면 다시 저장해야 함)
    isSaved = false;

    // 버튼 상태 변경
    saveBtn.style.display = 'block';
    editBtn.style.display = 'none';

    // 행 추가/삭제 버튼 다시 표시
    const addRowBtn = document.getElementById('addRowBtn');
    const deleteRowBtn = document.getElementById('deleteRowBtn');
    if (addRowBtn) {
        addRowBtn.style.display = 'block';
    }
    if (deleteRowBtn) {
        deleteRowBtn.style.display = 'block';
    }

    // 자동저장 표시 다시 표시
    autoSaveStatus.textContent = '작성중인 내용은 30초마다 자동저장 됩니다';

    // 코치님 한마디 안내문구 표시
    document.getElementById('coachGuideText').style.display = 'block';
}

// 병합된 행들을 원래 형태로 복원하는 함수
function unmergeTableRows() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        const data = JSON.parse(savedData);
        const programTable = document.getElementById('programTable');

        // 기존 행들 삭제
        const existingRows = programTable.querySelectorAll('.table-row');
        existingRows.forEach(row => row.remove());

        // 저장된 데이터로 행 복원
        if (data.program && data.program.length > 0) {
            data.program.forEach((item, index) => {
                const newRow = document.createElement('div');
                newRow.className = 'table-row';
                newRow.innerHTML = `
                    <div class="col-day">
                        <select class="day-select" data-day-index="${index}">
                            <option value="">-</option>
                            <option value="1일차">1일차</option>
                            <option value="2일차">2일차</option>
                            <option value="3일차">3일차</option>
                            <option value="4일차">4일차</option>
                            <option value="5일차">5일차</option>
                            <option value="6일차">6일차</option>
                            <option value="7일차">7일차</option>
                        </select>
                    </div>
                    <div class="col-exercise"><div class="editable" contenteditable="true" data-placeholder="운동 내용 입력">${item.exercise}</div></div>
                    <div class="col-reps"><div class="editable" contenteditable="true" data-placeholder="횟수">${item.reps}</div></div>
                    <div class="col-sets"><div class="editable" contenteditable="true" data-placeholder="세트">${item.sets}</div></div>
                    <div class="col-purpose"><div class="editable" contenteditable="true" data-placeholder="운동의 목적이나 달성할 목표를 입력하세요">${item.purpose}</div></div>
                `;

                programTable.appendChild(newRow);

                // 드롭다운 값 설정
                const daySelect = newRow.querySelector('.col-day .day-select');
                if (daySelect && item.day) {
                    daySelect.value = item.day;
                }

                // 이벤트 리스너 추가
                newRow.querySelectorAll('.editable').forEach(editable => {
                    editable.addEventListener('input', updatePlaceholders);
                    editable.addEventListener('paste', () => {
                        setTimeout(updatePlaceholders, 10);
                    });
                    editable.addEventListener('input', autoSave);
                });

                newRow.querySelector('.col-day .day-select').addEventListener('change', autoSave);

                updatePlaceholders();
            });
        }
    }
}

// 자동 임시저장 (30초마다) - 저장 전에만 실행
let autoSaveInterval;

function startAutoSave() {
    if (!autoSaveInterval) {
        autoSaveInterval = setInterval(() => {
            if (!isSaved) {
                autoSave();
            }
        }, 30000);
    }
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// Placeholder 관리 함수
function updatePlaceholders() {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(editable => {
        const isEmpty = !editable.textContent.trim();
        if (isEmpty) {
            editable.classList.add('empty-placeholder');
        } else {
            editable.classList.remove('empty-placeholder');
        }
    });
}
