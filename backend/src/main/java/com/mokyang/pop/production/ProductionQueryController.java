package com.mokyang.pop.production;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.PopSession;
import com.mokyang.pop.common.SpRows;

/** 생산실적관리 조회. 응답 행의 키는 SP 컬럼명(대문자) 그대로. */
@RestController
@RequestMapping("/api/production")
public class ProductionQueryController {

    private final ProductionQueryMapper mapper;

    public ProductionQueryController(ProductionQueryMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping("/works")
    public List<Map<String, Object>> works() {
        return SpRows.normalize(mapper.works());
    }

    @GetMapping("/work-centers")
    public List<Map<String, Object>> workCenters(@RequestParam(defaultValue = "") String workCode) {
        return SpRows.normalize(mapper.workCenters(workCode));
    }

    @GetMapping("/unwinds")
    public List<Map<String, Object>> unwinds() {
        return SpRows.normalize(mapper.unwinds());
    }

    /** 공장코드는 로그인 정보(원본 Settings.factory_code). 수주번호 인자는 원본처럼 항상 "". */
    @GetMapping("/plans")
    public List<Map<String, Object>> plans(
            @RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestParam(defaultValue = "") String workCode,
            @RequestParam(defaultValue = "") String workCenterCode,
            @RequestParam(defaultValue = "") String prodDate,
            @RequestParam(defaultValue = "false") boolean whole,
            @RequestParam(defaultValue = "") String itemName) {
        return SpRows.normalize(mapper.prodPlans(session.factoryCode(), workCode, workCenterCode, prodDate,
                whole ? "1" : "0", itemName, ""));
    }

    @GetMapping("/prods")
    public List<Map<String, Object>> prods(@RequestParam(defaultValue = "") String factoryCode,
            @RequestParam(defaultValue = "") String prodPlanDate,
            @RequestParam int prodPlanSeq,
            @RequestParam int prodSeq) {
        return SpRows.normalize(mapper.prods(factoryCode, prodPlanDate, prodPlanSeq, prodSeq));
    }

    @GetMapping("/materials")
    public List<Map<String, Object>> materials(@RequestParam(defaultValue = "") String factoryCode,
            @RequestParam(defaultValue = "") String prodPlanDate,
            @RequestParam int prodPlanSeq,
            @RequestParam int prodSeq,
            @RequestParam(defaultValue = "") String workCode) {
        return SpRows.normalize(mapper.materials(factoryCode, prodPlanDate, prodPlanSeq, prodSeq, workCode));
    }

    @GetMapping("/work-times")
    public List<Map<String, Object>> workTimes(@RequestParam(defaultValue = "") String factoryCode,
            @RequestParam(defaultValue = "") String prodPlanDate,
            @RequestParam int prodPlanSeq) {
        return SpRows.normalize(mapper.workTimes(factoryCode, prodPlanDate, prodPlanSeq));
    }

    /** 원본 GetOrderNoByLot: 첫 행의 ORDER_NO, 없으면 null */
    @GetMapping("/order-no")
    public Map<String, Object> orderNo(@RequestParam(defaultValue = "") String keyword) {
        List<Map<String, Object>> rows = SpRows.normalize(mapper.orderNoByLot(keyword));
        Map<String, Object> body = new HashMap<>();
        body.put("orderNo", rows.isEmpty() ? null : rows.get(0).get("ORDER_NO"));
        return body;
    }

    @GetMapping("/equipments")
    public List<Map<String, Object>> equipments(@RequestParam(defaultValue = "") String workCenterCode) {
        return SpRows.normalize(mapper.equipments(workCenterCode));
    }

    @GetMapping("/workers")
    public List<Map<String, Object>> workers(@RequestParam(defaultValue = "") String factoryCode,
            @RequestParam(defaultValue = "") String workCode,
            @RequestParam(defaultValue = "") String workCenterCode) {
        return SpRows.normalize(mapper.workers(factoryCode, workCode, workCenterCode));
    }

    @GetMapping("/barcode")
    public List<Map<String, Object>> barcode(@RequestParam(defaultValue = "") String factoryCode,
            @RequestParam(defaultValue = "") String lotNo,
            @RequestParam(defaultValue = "") String prodPlanDate,
            @RequestParam int prodPlanSeq,
            @RequestParam(defaultValue = "") String workCode) {
        return SpRows.normalize(mapper.barcode(factoryCode, lotNo, prodPlanDate, prodPlanSeq, workCode));
    }

    /** 원본 GetConversionQty: 첫 행의 QTY, 없으면 null */
    @GetMapping("/conversion-qty")
    public Map<String, Object> conversionQty(@RequestParam(defaultValue = "") String itemCode,
            @RequestParam(defaultValue = "0") double goodQty,
            @RequestParam(defaultValue = "0") double boxMaeQty,
            @RequestParam(defaultValue = "1") String boxMaeFlag) {
        List<Map<String, Object>> rows = SpRows.normalize(mapper.conversionQty(itemCode, goodQty, boxMaeQty, boxMaeFlag));
        Map<String, Object> body = new HashMap<>();
        body.put("qty", rows.isEmpty() ? null : rows.get(0).get("QTY"));
        return body;
    }

    /** 생산일정 팝업 (WorkProdPlanModule.GetMainList). 공장코드는 세션 */
    @GetMapping("/work-prod-plans")
    public List<Map<String, Object>> workProdPlans(
            @RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestParam(defaultValue = "") String workCode,
            @RequestParam(defaultValue = "") String workCenterCode,
            @RequestParam(defaultValue = "") String dateFrom,
            @RequestParam(defaultValue = "") String dateTo) {
        return SpRows.normalize(mapper.workProdPlans(session.factoryCode(), workCode, workCenterCode, dateFrom, dateTo));
    }

    /** 작업일보 팝업 (WorkDailyModule.GetMainList). 공장코드는 세션 */
    @GetMapping("/work-daily")
    public List<Map<String, Object>> workDaily(
            @RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestParam(defaultValue = "") String workCode,
            @RequestParam(defaultValue = "") String workCenterCode,
            @RequestParam(defaultValue = "") String date) {
        return SpRows.normalize(mapper.workDaily(session.factoryCode(), workCode, workCenterCode, date));
    }
}
