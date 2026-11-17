package com.mokyang.pop.production;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.PopSession;
import com.mokyang.pop.common.SpRows;
import com.mokyang.pop.production.dto.ProdLotIudRequest;
import com.mokyang.pop.production.dto.ProdLotProdRequest;

/** LOT 생성 팝업. 공장코드는 원본 Settings.factory_code = 로그인 세션 공장, @OPMAN_CODE 는 로그인 사번. */
@RestController
@RequestMapping("/api/production/lot")
public class ProdLotController {

    private final ProdLotMapper mapper;

    public ProdLotController(ProdLotMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping("/fields")
    public List<Map<String, Object>> fields(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestParam(defaultValue = "") String prodPlanDate,
            @RequestParam(defaultValue = "0") String prodPlanSeq,
            @RequestParam(defaultValue = "0") String prodSeq) {
        return SpRows.normalize(mapper.fields(session.factoryCode(), prodPlanDate, prodPlanSeq, prodSeq));
    }

    @GetMapping("/list")
    public List<Map<String, Object>> lots(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestParam(defaultValue = "") String prodPlanDate,
            @RequestParam(defaultValue = "0") String prodPlanSeq,
            @RequestParam(defaultValue = "0") String prodSeq,
            @RequestParam(defaultValue = "") String materialCode) {
        return SpRows.normalize(mapper.lots(session.factoryCode(), prodPlanDate, prodPlanSeq, prodSeq, materialCode));
    }

    @GetMapping("/new")
    public List<Map<String, Object>> newLots(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestParam(defaultValue = "") String materialCode,
            @RequestParam(defaultValue = "") String workCode,
            @RequestParam(defaultValue = "0") String slitterQ,
            @RequestParam(defaultValue = "0") String slitterH,
            @RequestParam(defaultValue = "0") String boxM,
            @RequestParam(defaultValue = "") String workFinishFlag) {
        return SpRows.normalize(mapper.newLots(session.factoryCode(), materialCode, workCode, slitterQ, slitterH, boxM, workFinishFlag));
    }

    /** 원본 SetDataWithReturn(ExecuteScalar): 첫 결과의 첫 행 첫 열, 없으면 null */
    @PostMapping("/save")
    public Map<String, Object> save(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestBody ProdLotIudRequest request) {
        List<Map<String, Object>> rows = SpRows.normalize(mapper.lotIud(request, session.factoryCode(), session.employeeNo()));
        Map<String, Object> body = new HashMap<>();
        body.put("value", rows.isEmpty() || rows.get(0).isEmpty() ? null : rows.get(0).values().iterator().next());
        return body;
    }

    @PostMapping("/prod")
    public ResponseEntity<Void> prod(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestBody ProdLotProdRequest request) {
        mapper.prodUpdate(request, session.factoryCode(), session.employeeNo());
        return ResponseEntity.noContent().build();
    }
}
