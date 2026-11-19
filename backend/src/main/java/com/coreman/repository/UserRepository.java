package com.coreman.repository;

import com.coreman.model.User;
import com.coreman.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    long countByRole(Role role);

    long countByRoleAndCreatedAtAfter(Role role, LocalDateTime after);

    boolean existsByEmail(String email);
}
