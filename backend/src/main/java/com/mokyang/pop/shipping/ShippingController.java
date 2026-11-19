package com.mokyang.pop.shipping;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.PopSession;
import com.mokyang.pop.common.Maps;
import com.mokyang.pop.common.SpRows;
import com.mokyang.pop.shipping.dto.ShippingLotIudRequest;

/** 출하관리. 조회 응답 행의 키는 컬럼명(대문자) 그대로. */
@RestController
@RequestMapping("/api/shipping")
public class ShippingController {

    private final ShippingMapper mapper;
    private final ShippingLotIudExecutor executor;

    public ShippingController(ShippingMapper mapper, ShippingLotIudExecutor executor) {
        this.mapper = mapper;
        this.executor = executor;
    }

    @GetMapping("/list")
    public List<Map<String, Object>> list(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestParam(defaultValue = "") String date,
            @RequestParam(defaultValue = "") String materialName,
            @RequestParam(defaultValue = "") String status) {
        return SpRows.normalize(mapper.list(session.factoryCode(), date, materialName, status));
    }

    @GetMapping("/order-gbn")
    public List<Map<String, Object>> orderGbn() {
        return SpRows.normalize(mapper.orderGbn());
    }

    @GetMapping("/lot/list")
    public List<Map<String, Object>> lotList(@RequestParam(defaultValue = "") String factoryCode,
            @RequestParam(defaultValue = "") String materialCode,
            @RequestParam(defaultValue = "") String shipplanSeq,
            @RequestParam(defaultValue = "") String lotNo,
            @RequestParam(defaultValue = "0") String qty) {
        return SpRows.normalize(mapper.lotList(factoryCode, materialCode, shipplanSeq, lotNo, qty));
    }

    /** 결과 = 원본 SetData(ExecuteNonQuery) 반환값: SP 안 영향 행 수의 합 */
    @PostMapping("/lot/iud")
    public Map<String, Object> lotIud(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestBody ShippingLotIudRequest request) {
        return Maps.of("count", executor.execute(request, session.employeeNo()));
    }
}
