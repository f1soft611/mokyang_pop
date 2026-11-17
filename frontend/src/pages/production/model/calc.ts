import { formatN0 } from '../../../shared/dialog/padInput';
import type { MaterialRow, ProdData } from './types';

/**
 * 원본 ProductionModule 의 수량 계산(AutoCalcRatio, Change*Qty)과 Production.xaml.cs 의 TextChanged 연쇄.
 *
 * 원본에서 ProdData.X 에 값을 넣으면 그 값이 바인딩된 TextBox 글자(N0)가 바뀌고, 글자가 바뀌었을 때만
 * TextChanged 가 그 자리에서(안쪽으로) 실행된다. 핸들러는 TextBox 글자를 float.Parse 한 값(= N0 로 반올림한 값)을 받는다.
 * 핸들러가 끝나면 바깥 처리가 이어진다. 이 순서를 setProd() 재귀로 그대로 재현한다.
 * 계산 연쇄는 사용자 동작에서만 시작한다(#17·18): 이 모듈은 화면 로드에서 불리지 않는다.
 */

export type QtyField = 'inputQty' | 'goodQty' | 'restQty' | 'lossQty' | 'changeQty' | 'velocityQty' | 'boxMae';

export type WorkState = {
  prodData: ProdData;
  material1: MaterialRow[];
  material2: MaterialRow[];
  /** 원본 SearchWorkCode */
  searchWorkCode: string;
};

export type CalcResult = { state: WorkState; alerts: string[] };

const MAX_DEPTH = 20;

/** N0 표시 글자를 다시 숫자로 (원본 float.Parse(TextBox.Text)) */
function parsedText(v: number): number {
  return Number(formatN0(v).replace(/,/g, ''));
}

class Ctx {
  d: ProdData;
  m1: MaterialRow[];
  m2: MaterialRow[];
  readonly searchWorkCode: string;
  readonly alerts: string[] = [];
  depth = 0;

  constructor(s: WorkState) {
    this.d = { ...s.prodData };
    this.m1 = s.material1.map((m) => ({ ...m }));
    this.m2 = s.material2.map((m) => ({ ...m }));
    this.searchWorkCode = s.searchWorkCode;
  }

  state(): WorkState {
    return { prodData: this.d, material1: this.m1, material2: this.m2, searchWorkCode: this.searchWorkCode };
  }

  alert(msg: string) {
    this.alerts.push(msg);
  }

  /** ProdData.X = v (바인딩된 TextBox 글자가 바뀌면 그 TextChanged 를 바로 실행) */
  setProd(field: QtyField, v: number) {
    const before = formatN0(this.d[field]);
    this.d = { ...this.d, [field]: v };
    if (formatN0(v) === before) return;
    if (this.depth >= MAX_DEPTH) return; // 원본에 없는 안전장치 — 정상 흐름에서는 닿지 않는다
    this.depth++;
    try {
      this.onTextChanged(field, parsedText(v));
    } finally {
      this.depth--;
    }
  }

  /** Production.xaml.cs ChangeInputQty/ChangeGoodQty/ChangeRestQty/ChangeLossQty (회로원단·속도·봉투매수는 여기서 없음) */
  private onTextChanged(field: QtyField, v: number) {
    switch (field) {
      case 'inputQty':
        this.autoCalcRatio();
        this.changeInputQty(v);
        break;
      case 'goodQty':
        this.autoCalcRatio();
        this.changeGoodQty(v);
        break;
      case 'restQty':
        this.autoCalcRatio();
        this.changeRestQty(v);
        break;
      case 'lossQty':
        this.autoCalcRatio();
        this.changeLossQty(v);
        break;
      default:
        break;
    }
  }

  /** ProductionModule.cs:908 */
  autoCalcRatio() {
    if (!this.d.prodStatusWork) return;
    const { inputQty, goodQty, lossQty, restQty } = this.d;
    const ratio = inputQty > 0 && goodQty > 0 ? ((goodQty - lossQty) / (inputQty - restQty)) * 100 : 0;
    this.d = { ...this.d, prodRatio: ratio };
  }

  private item1(): MaterialRow | undefined {
    return this.m1.find((m) => m.matLotNo === this.d.mat1LotNo);
  }

  /** ProductionModule.cs:1678 */
  changeInputQty(newInputQty: number) {
    if (!this.d.material1Code) return;
    const item = this.item1();
    if (!item) return;
    if (item.inputQty < newInputQty) {
      this.alert('투입수량이 재고량보다 많습니다.\n투입수량을 다시 입력하세요.');
      this.setProd('inputQty', item.inputQty);
    } else {
      item.inputQty = newInputQty; // #9: 재고 상한을 덮어씀 (원본 그대로)
      if (item.goodQty > 0) item.lossQty = newInputQty - item.goodQty;
      item.restQty = newInputQty - item.goodQty - item.lossQty;
    }
  }

  /** ProductionModule.cs:1705 */
  changeGoodQty(newGoodQty: number) {
    if (this.d.material1Code) {
      const item = this.item1();
      if (item) {
        if (item.inputQty < newGoodQty) {
          this.alert('정상량이 재고량보다 많습니다.\n정상량을 다시 입력하세요.');
          this.setProd('goodQty', 0);
        } else {
          item.goodQty = newGoodQty;
          item.restQty = item.inputQty - (newGoodQty + item.lossQty);
          this.setProd('restQty', item.inputQty - (newGoodQty + item.lossQty));
        }
      }
    }
    if (this.d.material2Code) {
      let total = newGoodQty;
      for (const item of this.m2) {
        if (!item.materialCode) continue;
        if (total <= 0) break;
        if (item.inputQty >= total) {
          item.goodQty = total;
          item.restQty = item.inputQty - (total + item.lossQty);
          total = 0;
        } else {
          item.goodQty = item.inputQty;
          item.restQty = 0;
          item.lossQty = 0;
          total -= item.inputQty;
        }
      }
    }
  }

  /** ProductionModule.cs:1760 */
  changeRestQty(newRestQty: number) {
    if (this.d.material1Code) {
      const item = this.item1();
      if (item) {
        if (item.inputQty < newRestQty) {
          this.alert('잔량이 재고량보다 많습니다.\n잔량을 다시 입력하세요.');
          this.setProd('restQty', 0);
          item.restQty = 0;
        } else if (item.inputQty < item.goodQty + newRestQty) {
          this.alert('잔량을 다시 입력하세요.');
          this.setProd('restQty', 0);
          item.restQty = 0;
        } else {
          item.restQty = newRestQty;
          this.setProd('restQty', newRestQty);
        }
      }
    }
    if (this.d.material2Code) {
      let total = newRestQty;
      for (const item of this.m2) {
        if (total <= 0) break;
        if (item.inputQty - (item.goodQty + item.lossQty) >= total) {
          item.restQty = total;
          total = 0;
        } else if (item.goodQty + item.lossQty === 0) {
          item.restQty = item.inputQty;
          total -= item.inputQty;
        } else {
          item.restQty = item.inputQty - (item.goodQty + item.lossQty);
          total -= item.inputQty - (item.goodQty + item.lossQty);
        }
      }
    }
  }

  /** ProductionModule.cs:1824 (Loss 변경으로 잔량 자동 재계산은 원본에서 주석 처리) */
  changeLossQty(newLossQty: number) {
    if (this.d.material1Code) {
      const item = this.item1();
      if (item) {
        if (item.inputQty < newLossQty) {
          this.alert('Loss량이 재고량보다 많습니다.\nLoss량을 다시 입력하세요.');
          this.setProd('lossQty', 0);
          item.lossQty = 0;
        } else if (item.inputQty < item.goodQty + newLossQty) {
          this.alert('Loss량을 다시 입력하세요.');
          this.setProd('lossQty', 0);
          item.lossQty = 0;
        } else {
          item.lossQty = newLossQty;
          this.setProd('lossQty', newLossQty);
        }
      }
    }
    if (this.d.material2Code) {
      let total = newLossQty;
      for (const item of this.m2) {
        if (total <= 0) break;
        if (item.inputQty - item.goodQty >= total) {
          item.lossQty = total;
          total = 0;
        } else {
          item.lossQty = item.inputQty - item.goodQty;
          total -= item.inputQty - item.goodQty;
        }
      }
    }
  }
}

export function autoCalcRatio(s: WorkState): WorkState {
  const c = new Ctx(s);
  c.autoCalcRatio();
  return c.state();
}

/** 사용자 입력 하나(패드 적용 등)로 필드를 바꾸고 원본 연쇄를 실행한다 */
export function applyFieldChange(s: WorkState, field: QtyField, value: number): CalcResult {
  const c = new Ctx(s);
  c.setProd(field, value);
  return { state: c.state(), alerts: c.alerts };
}

/** Production.xaml.cs ClickRest */
export function clickRest(s: WorkState): CalcResult {
  const c = new Ctx(s);
  if (c.d.prodStatus === '1') {
    if (c.d.goodQty <= 0) {
      c.alert('정상수량을 입력하세요!');
    } else {
      c.setProd('restQty', c.d.inputQty - c.d.goodQty);
      c.setProd('lossQty', 0);
    }
  } else {
    c.alert('작업이 시작되지 않았습니다!');
  }
  return { state: c.state(), alerts: c.alerts };
}

/** Production.xaml.cs ClickLoss */
export function clickLoss(s: WorkState): CalcResult {
  const c = new Ctx(s);
  if (c.d.prodStatus === '1') {
    if (c.d.goodQty <= 0) {
      c.alert('정상수량을 입력하세요!');
    } else {
      c.setProd('lossQty', c.d.inputQty - c.d.goodQty);
      c.setProd('restQty', 0);
    }
  } else {
    c.alert('작업이 시작되지 않았습니다!');
  }
  return { state: c.state(), alerts: c.alerts };
}

/** ProductionModule.InputMaterial1/2 + Production.xaml.cs InputMaterial (성공 시 수량 0, 탭 이동은 호출하는 쪽) */
export function inputMaterial(s: WorkState, gg: '1' | '2', index: number): CalcResult & { ok: boolean } {
  const c = new Ctx(s);
  if (c.d.prodStatus !== '1') {
    c.alert('작업이 시작되지 않았습니다.');
    return { state: c.state(), alerts: c.alerts, ok: false };
  }
  const row = (gg === '1' ? c.m1 : c.m2)[index];
  if (!row || !row.materialCode) {
    c.alert('투입 대상을 선택하세요.');
    return { state: c.state(), alerts: c.alerts, ok: false };
  }
  const name = row.materialSpec ? `${row.materialName}(${row.materialSpec})` : row.materialName;
  if (gg === '1') {
    c.d = { ...c.d, material1Name: name, material1Code: row.materialCode, mat1LotNo: row.matLotNo };
    c.setProd('inputQty', row.inputQty);
  } else {
    c.d = { ...c.d, material2Name: name, material2Code: row.materialCode, mat2LotNo: row.matLotNo };
  }
  c.setProd('goodQty', 0);
  c.setProd('lossQty', 0);
  c.setProd('restQty', 0);
  return { state: c.state(), alerts: c.alerts, ok: true };
}
