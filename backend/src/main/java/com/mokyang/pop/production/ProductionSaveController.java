package com.mokyang.pop.production;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.PopSession;
import com.mokyang.pop.common.SpRows;
import com.mokyang.pop.production.dto.MaterialIudRequest;
import com.mokyang.pop.production.dto.ProdIudRequest;
import com.mokyang.pop.production.dto.WorktimeIudRequest;

/** 생산실적 저장. 원본처럼 SP 하나씩 따로 부른다(호출 순서는 화면이 정함). @OPMAN_CODE 는 로그인 사번. */
@RestController
@RequestMapping("/api/production/save")
public class ProductionSaveController {

    private final ProductionSaveMapper mapper;

    public ProductionSaveController(ProductionSaveMapper mapper) {
        this.mapper = mapper;
    }

    /** 원본 SetDataWithReturn(ExecuteScalar): 첫 결과의 첫 행 첫 열, 없으면 null */
    @PostMapping("/prod")
    public Map<String, Object> prod(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestBody ProdIudRequest request) {
        List<Map<String, Object>> rows = SpRows.normalize(mapper.prodIud(request, session.employeeNo()));
        Map<String, Object> body = new HashMap<>();
        body.put("value", rows.isEmpty() || rows.get(0).isEmpty() ? null : rows.get(0).values().iterator().next());
        return body;
    }

    @PostMapping("/material")
    public ResponseEntity<Void> material(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestBody MaterialIudRequest request) {
        mapper.materialIud(request, session.employeeNo());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/worktime")
    public ResponseEntity<Void> worktime(@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session,
            @RequestBody WorktimeIudRequest request) {
        mapper.worktimeIud(request, session.employeeNo());
        return ResponseEntity.noContent().build();
    }
}
