package com.coreman.controller;

import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Address;
import com.coreman.model.User;
import com.coreman.repository.AddressRepository;
import com.coreman.repository.UserRepository;
import com.coreman.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Address>> getAddresses(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(addressRepository.findByUserIdOrderByIsDefaultDesc(principal.getId()));
    }

    @PostMapping
    public ResponseEntity<Address> create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody Address address) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        address.setUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(addressRepository.save(address));
    }
}
