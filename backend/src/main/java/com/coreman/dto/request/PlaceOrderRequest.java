package com.coreman.dto.request;

import jakarta.validation.constraints.NotNull;

public record PlaceOrderRequest(
        @NotNull Long shippingAddressId
) {}
