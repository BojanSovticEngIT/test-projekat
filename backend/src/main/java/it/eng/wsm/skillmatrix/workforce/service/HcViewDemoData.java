package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.enums.WorkforceType;
import java.util.ArrayList;
import java.util.List;

/**
 * Hardcoded headcount shown by the HC view for the demo. {@link HcViewService#getHeadcountView()} starts from
 * these rows and adds the real employees from the database on top. Remove this class (and the loop that reads it)
 * once the demo is over.
 */
final class HcViewDemoData {

    record DemoEmployee(String n1, String n2, String country, WorkforceType type) {}

    static final List<DemoEmployee> EMPLOYEES = build();

    private HcViewDemoData() {}

    private static List<DemoEmployee> build() {
        List<DemoEmployee> list = new ArrayList<>();
        String digital = "ENG DIGITAL";

        add(list, digital, "ATLANTIC - ADVANCED ENTERPRISE PLATFORMS", "Serbia", WorkforceType.EMPLOYEE, 2);
        add(list, digital, "ATLANTIC - ADVANCED ENTERPRISE PLATFORMS", "Romania", WorkforceType.EMPLOYEE, 1);

        add(list, digital, "ADVANCED ENTERPRISE PLATFORMS", "Serbia", WorkforceType.EMPLOYEE, 3);
        add(list, digital, "ADVANCED ENTERPRISE PLATFORMS", "Serbia", WorkforceType.B2B, 1);
        add(list, digital, "ADVANCED ENTERPRISE PLATFORMS", "Albania", WorkforceType.EMPLOYEE, 1);

        add(list, digital, "APPLICATION MODERNIZATION AND MANAGEMENT", "Serbia", WorkforceType.EMPLOYEE, 3);
        add(list, digital, "APPLICATION MODERNIZATION AND MANAGEMENT", "Serbia", WorkforceType.SUPPLIER, 1);
        add(list, digital, "APPLICATION MODERNIZATION AND MANAGEMENT", "India", WorkforceType.EMPLOYEE, 1);

        add(list, digital, "ENG CLOUD", "Serbia", WorkforceType.EMPLOYEE, 2);
        add(list, digital, "ENG CLOUD", "Poland", WorkforceType.EMPLOYEE, 1);
        add(list, digital, "ENG CLOUD", "Italy", WorkforceType.EMPLOYEE, 1);

        add(list, digital, "EXTRARED", "Serbia", WorkforceType.EMPLOYEE, 2);
        add(list, digital, "EXTRARED", "Bulgaria", WorkforceType.B2B, 1);
        add(list, digital, "EXTRARED", "Germany", WorkforceType.SUPPLIER, 1);

        add(list, digital, "ENG SECURITY", "Serbia", WorkforceType.EMPLOYEE, 2);

        add(list, digital, "ENG AI & DATA", "Serbia", WorkforceType.EMPLOYEE, 2);
        add(list, digital, "ENG AI & DATA", "Egypt", WorkforceType.EMPLOYEE, 1);

        add(list, digital, "DIGITAL EXPERIENCE", "Serbia", WorkforceType.EMPLOYEE, 2);
        add(list, digital, "DIGITAL EXPERIENCE", "Brazil", WorkforceType.EMPLOYEE, 1);

        add(list, digital, "INDUSTRY EXCELLENCE", "Serbia", WorkforceType.EMPLOYEE, 1);

        add(list, digital, "TECHNOLOGY SERVICES", "Serbia", WorkforceType.EMPLOYEE, 2);
        add(list, digital, "TECHNOLOGY SERVICES", "Tunisia", WorkforceType.SUPPLIER, 1);

        add(list, "ENTERPRISE", "NET@SUITE", "Serbia", WorkforceType.EMPLOYEE, 2);
        add(list, "ENTERPRISE", "CONSUMER & INDUSTRIAL GOODS", "Serbia", WorkforceType.EMPLOYEE, 1);
        add(list, "ENTERPRISE", "CONSUMER & INDUSTRIAL GOODS", "Cameroon", WorkforceType.EMPLOYEE, 1);

        add(list, "FINANCIAL SERVICES", "FINANCIAL SERVICES", "Serbia", WorkforceType.EMPLOYEE, 1);
        add(list, "HEALTH CARE", "HEALTH CARE", "Serbia", WorkforceType.EMPLOYEE, 1);

        String group = "GROUP ADMINISTRATION, FINANCE, CONTROL & PROCUREMENT";
        add(list, group, "Corporate Functions", "Serbia", WorkforceType.EMPLOYEE, 1);
        add(list, group, "FINANCE", "Serbia", WorkforceType.EMPLOYEE, 1);
        add(list, group, "Other", "Serbia", WorkforceType.EMPLOYEE, 1);

        return List.copyOf(list);
    }

    private static void add(
            List<DemoEmployee> list, String n1, String n2, String country, WorkforceType type, int count) {
        for (int i = 0; i < count; i++) {
            list.add(new DemoEmployee(n1, n2, country, type));
        }
    }
}
