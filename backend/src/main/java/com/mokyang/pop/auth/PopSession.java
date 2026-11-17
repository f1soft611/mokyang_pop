package com.mokyang.pop.auth;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 로그인한 사용자 정보. 원본 LoginModel / Settings(employee_cache, factory_code, employee_dept)에 해당.
 * employeeNo 는 원본처럼 입력한 로그인 ID 이며, 모든 IUD SP의 @OPMAN_CODE 로 쓰인다.
 */
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
public final class PopSession {
    private final String employeeNo;
    private final String factoryCode;
    private final String deptName;

    @JsonCreator
    public PopSession(@JsonProperty("employeeNo") String employeeNo, @JsonProperty("factoryCode") String factoryCode, @JsonProperty("deptName") String deptName) {
        this.employeeNo = employeeNo;
        this.factoryCode = factoryCode;
        this.deptName = deptName;
    }

    public String employeeNo() {
        return employeeNo;
    }

    public String factoryCode() {
        return factoryCode;
    }

    public String deptName() {
        return deptName;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PopSession)) return false;
        PopSession x = (PopSession) o;
        return java.util.Objects.equals(employeeNo, x.employeeNo)
                && java.util.Objects.equals(factoryCode, x.factoryCode)
                && java.util.Objects.equals(deptName, x.deptName);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(employeeNo, factoryCode, deptName);
    }

    @Override
    public String toString() {
        return "PopSession[employeeNo=" + employeeNo + ", factoryCode=" + factoryCode + ", deptName=" + deptName + "]";
    }
}
