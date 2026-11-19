package com.mokyang.pop.shipping;

import java.sql.CallableStatement;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.mokyang.pop.shipping.dto.ShippingLotIudRequest;

/**
 * SP_CPOP301_WIN02_01_IUD 호출. 원본 ExecuteNonQuery() 반환값(SP 안 INSERT/UPDATE/DELETE 영향 행 수의 합)을 돌려준다.
 * MyBatis 로는 첫 update count 만 보이므로 JDBC 로 모든 결과를 따라가며 합한다.
 */
@Component
public class ShippingLotIudExecutor {

    private final JdbcTemplate jdbc;

    public ShippingLotIudExecutor(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    public int execute(ShippingLotIudRequest r, String opmanCode) {
        Integer count = jdbc.execute(
                con -> con.prepareCall("{call SP_CPOP301_WIN02_01_IUD(?,?,?,?,?,?,?,?,?,?,?)}"),
                (CallableStatement cs) -> {
                    cs.setString(1, r.getFactoryCode());
                    cs.setString(2, r.getShipplanSeq());
                    cs.setString(3, r.getLotSeq());
                    cs.setString(4, r.getItemCode());
                    cs.setString(5, r.getLotNo());
                    cs.setDouble(6, r.getOutputQty());
                    cs.setString(7, r.getOutWarehouseCode());
                    cs.setString(8, r.getOutLocationCode());
                    cs.setDouble(9, r.getOutQtyRollBox());
                    cs.setString(10, r.getIru());
                    cs.setString(11, opmanCode);
                    return sumUpdateCounts(cs);
                });
        return count == null ? 0 : count;
    }

    /** execute() 결과부터 getMoreResults() 를 따라가며 update count(-1 아닌 값)를 모두 더한다. 결과 집합은 건너뛴다. */
    static int sumUpdateCounts(CallableStatement cs) throws SQLException {
        int total = 0;
        boolean isResultSet = cs.execute();
        while (true) {
            if (!isResultSet) {
                int n = cs.getUpdateCount();
                if (n == -1) {
                    break;
                }
                total += n;
            }
            isResultSet = cs.getMoreResults();
        }
        return total;
    }
}
