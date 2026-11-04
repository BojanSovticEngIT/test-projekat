package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.common.Countries;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/countries")
public class CountryController {

    @GetMapping
    public ResponseEntity<List<String>> getCountries() {
        return ResponseEntity.ok(Countries.ALL);
    }
}
