package com.coreman.config;

import com.coreman.repository.UserRepository;
import com.coreman.security.JwtAuthenticationFilter;
import com.coreman.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Missing/invalid token → 401 (log in again); valid token but wrong role → 403.
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Spring forwards errors (e.g. a 403) to /error; it must be public or every error becomes a 401.
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/refresh",
                                "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/reset-password/check").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/campaigns/**", "/api/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/categories/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/*/reviews").permitAll()
                        .requestMatchers("/api/payments/webhook").permitAll()
                        // Guest checkout: cart preview, orders, tracking, guest payment (rate-limited in GuestController)
                        .requestMatchers("/api/guest/**").permitAll()
                        // SSLCommerz posts the customer's browser and its IPN here (no login); /init needs a signed-in customer.
                        .requestMatchers("/api/payments/sslcommerz/status", "/api/payments/sslcommerz/success",
                                "/api/payments/sslcommerz/fail", "/api/payments/sslcommerz/cancel",
                                "/api/payments/sslcommerz/ipn").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        new JwtAuthenticationFilter(tokenProvider, userRepository),
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
