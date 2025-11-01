// 저장소 키
const STORAGE_KEY = 'coachNote';
const TEMP_STORAGE_KEY = 'coachNoteTempSave';

// 요소 가져오기
const resetBtn = document.getElementById('resetBtn');
const tempSaveBtn = document.getElementById('tempSaveBtn');
const saveBtn = document.getElementById('saveBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const notification = document.getElementById('notification');

// 페이지 로드 시 데이터 불러오지 않음 (항상 빈 화면)
window.addEventListener('DOMContentLoaded', () => {
    // 데이터 로드 비활성화 - 항상 빈 화면으로 시작
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
        program: []
    };

    const programRows = document.querySelectorAll('#programTable .table-row');
    programRows.forEach(row => {
        const day = row.querySelector('.col-day .day-label').innerHTML;
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

        const programRows = document.querySelectorAll('#programTable .table-row');
        data.program.forEach((item, index) => {
            if (programRows[index]) {
                programRows[index].querySelector('.col-exercise .editable').innerHTML = item.exercise || '';
                programRows[index].querySelector('.col-reps .editable').innerHTML = item.reps || '';
                programRows[index].querySelector('.col-sets .editable').innerHTML = item.sets || '';
                programRows[index].querySelector('.col-purpose .editable').innerHTML = item.purpose || '';
            }
        });
    }
}

// 초기화 버튼
resetBtn.addEventListener('click', () => {
    if (confirm('모든 내용을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        // 모든 텍스트 필드 초기화
        document.getElementById('question').innerHTML = '';
        document.getElementById('analysis').innerHTML = '';
        document.getElementById('improvement').innerHTML = '';

        // 테이블 초기화
        const programRows = document.querySelectorAll('#programTable .table-row');
        programRows.forEach(row => {
            row.querySelector('.col-exercise .editable').innerHTML = '';
            row.querySelector('.col-reps .editable').innerHTML = '';
            row.querySelector('.col-sets .editable').innerHTML = '';
            row.querySelector('.col-purpose .editable').innerHTML = '';
        });

        // 로컬 스토리지 삭제
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TEMP_STORAGE_KEY);

        // 저장 상태 초기화
        isSaved = false;

        // 잠금 해제
        unlockAllEditableFields();

        showNotification('모든 내용이 초기화되었습니다.');
    }
});

// 임시저장 버튼
tempSaveBtn.addEventListener('click', () => {
    const data = collectData();
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(data));
    showNotification('임시저장되었습니다!');
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

    showNotification('저장되었습니다!');
});

// 편집 가능한 필드를 잠금
function lockAllEditableFields() {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(editable => {
        editable.contentEditable = 'false';
        editable.classList.add('locked');
    });

    // 버튼 상태 변경
    saveBtn.style.display = 'none';
    tempSaveBtn.textContent = '수정하기';
    tempSaveBtn.className = 'btn btn-warning';
    tempSaveBtn.onclick = unlockAllEditableFields;
}

// 편집 가능한 필드를 잠금 해제
function unlockAllEditableFields() {
    const editables = document.querySelectorAll('.editable');
    editables.forEach(editable => {
        editable.contentEditable = 'true';
        editable.classList.remove('locked');
    });

    // 저장 상태 초기화 (수정 모드로 돌아가면 다시 저장해야 함)
    isSaved = false;

    // 버튼 상태 변경
    saveBtn.style.display = 'block';
    tempSaveBtn.textContent = '임시저장';
    tempSaveBtn.className = 'btn btn-secondary';
    tempSaveBtn.onclick = () => {
        const data = collectData();
        localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(data));
        showNotification('임시저장되었습니다!');
    };
}

// 저장 상태 추적 변수
let isSaved = false;

// PDF 출력 버튼
exportPdfBtn.addEventListener('click', () => {
    // 저장 여부 확인
    if (!isSaved) {
        alert('저장을 먼저 해주세요!\nPDF 출력은 저장 후 가능합니다.');
        return;
    }

    const element = document.querySelector('.container');
    const buttonGroup = document.querySelector('.button-group');

    // 버튼 숨기기
    buttonGroup.style.display = 'none';

    showNotification('PDF 생성 중...');

    // PDF 생성 전 폰트 크기 강제 변경
    const allElements = element.querySelectorAll('*');
    const originalStyles = [];

    allElements.forEach((el, index) => {
        originalStyles[index] = el.style.cssText;

        // 폰트 크기와 라인 높이만 변경
        el.style.fontSize = '9pt';
        el.style.lineHeight = '1.4';

        // editable 요소는 padding과 정렬 설정
        if (el.classList.contains('editable')) {
            el.style.padding = '10px 8px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.minHeight = '40px';
        }
    });

    // 제목과 섹션 헤더만 다르게
    element.querySelector('h1').style.fontSize = '14pt';
    element.querySelectorAll('.section h2').forEach(h2 => {
        h2.style.fontSize = '10pt';
    });

    // 테이블 셀은 더 컴팩트하게
    element.querySelectorAll('.table-row .editable').forEach(cell => {
        cell.style.padding = '8px 6px';
        cell.style.minHeight = '35px';
    });

    // 테이블 행도 가운데 정렬
    element.querySelectorAll('.col-day, .col-exercise, .col-reps, .col-sets, .col-purpose').forEach(col => {
        col.style.display = 'flex';
        col.style.alignItems = 'center';
    });

    // PDF 옵션 설정
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `운동코치노트_${new Date().toLocaleDateString('ko-KR')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    // PDF 생성
    html2pdf().set(opt).from(element).save().then(() => {
        // 원래 스타일로 복원
        allElements.forEach((el, index) => {
            el.style.cssText = originalStyles[index];
        });
        buttonGroup.style.display = 'flex';
        showNotification('PDF가 생성되었습니다!');
    }).catch(err => {
        // 원래 스타일로 복원
        allElements.forEach((el, index) => {
            el.style.cssText = originalStyles[index];
        });
        buttonGroup.style.display = 'flex';
        showNotification('PDF 생성 중 오류가 발생했습니다.');
        console.error(err);
    });
});

// 자동 임시저장 (30초마다)
setInterval(() => {
    const data = collectData();
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(data));
}, 30000);
