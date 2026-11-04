package it.eng.wsm.skillmatrix.support;

import java.util.UUID;

public final class TestSeedData {

    public static final String PASSWORD = "password";

    public static final UUID USER_ADMIN = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    public static final UUID USER_EMPLOYEE = UUID.fromString("a0000000-0000-0000-0000-000000000002");
    public static final UUID USER_MANAGER = UUID.fromString("a0000000-0000-0000-0000-000000000003");
    public static final UUID USER_HR = UUID.fromString("a0000000-0000-0000-0000-000000000004");
    public static final UUID USER_PMO = UUID.fromString("a0000000-0000-0000-0000-000000000060");
    public static final UUID USER_HRBP = UUID.fromString("a0000000-0000-0000-0000-000000000061");

    public static final UUID EMPLOYEE_ONE = UUID.fromString("e0000000-0000-0000-0000-000000000003");
    public static final UUID EMPLOYEE_TWO = UUID.fromString("e0000000-0000-0000-0000-000000000004");
    public static final UUID EMPLOYEE_PMO = UUID.fromString("e0000000-0000-0000-0000-000000000060");

    private TestSeedData() {
    }
}
