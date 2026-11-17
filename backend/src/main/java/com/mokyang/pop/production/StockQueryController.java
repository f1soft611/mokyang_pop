package com.mokyang.pop.production;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mokyang.pop.common.SpRows;

/** 자재 재고 조회 팝업. 응답 행의 키는 컬럼명(대문자) 그대로. */
@RestController
@RequestMapping("/api/production/stock")
public class StockQueryController {

    private final StockQueryMapper mapper;

    public StockQueryController(StockQueryMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping("/default-info")
    public List<Map<String, Object>> defaultInfo(@RequestParam(defaultValue = "") String factoryCode,
            @RequestParam(defaultValue = "") String prodPlanDate,
            @RequestParam int prodPlanSeq,
            @RequestParam(defaultValue = "") String ggFlag) {
        return SpRows.normalize(mapper.defaultInfo(factoryCode, prodPlanDate, prodPlanSeq, ggFlag));
    }

    @GetMapping("/item-kind2")
    public List<Map<String, Object>> itemKind2() {
        return SpRows.normalize(mapper.itemKind2());
    }

    @GetMapping("/item-kind3")
    public List<Map<String, Object>> itemKind3(@RequestParam(defaultValue = "") String itemKind2) {
        return SpRows.normalize(mapper.itemKind3(itemKind2));
    }

    @GetMapping("/list")
    public List<Map<String, Object>> stockList(@RequestParam(defaultValue = "") String materialCode,
            @RequestParam(defaultValue = "") String itemKind2,
            @RequestParam(defaultValue = "") String itemKind3,
            @RequestParam(defaultValue = "0") String widthFrom,
            @RequestParam(defaultValue = "0") String widthTo,
            @RequestParam(defaultValue = "") String orderNo,
            @RequestParam(defaultValue = "") String workCode,
            @RequestParam(defaultValue = "0") String workSeq,
            @RequestParam(defaultValue = "") String ggFlag) {
        return SpRows.normalize(mapper.stockList(materialCode, itemKind2, itemKind3, widthFrom, widthTo, orderNo, workCode,
                workSeq, ggFlag));
    }
}
