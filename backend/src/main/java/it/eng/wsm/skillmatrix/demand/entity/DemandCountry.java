package it.eng.wsm.skillmatrix.demand.entity;

import it.eng.wsm.skillmatrix.entity.Employee;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.util.Objects;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A country the candidates may come from, with the HR Business Partner responsible for it (demand_country). */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class DemandCountry {

    @Column(name = "country", nullable = false, length = 100)
    private String country;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_business_partner_id")
    private Employee hrBusinessPartner;

    public DemandCountry(String country, Employee hrBusinessPartner) {
        this.country = country;
        this.hrBusinessPartner = hrBusinessPartner;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof DemandCountry that && Objects.equals(country, that.country)
                && Objects.equals(partnerId(), that.partnerId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(country, partnerId());
    }

    private Object partnerId() {
        return hrBusinessPartner != null ? hrBusinessPartner.getId() : null;
    }
}
