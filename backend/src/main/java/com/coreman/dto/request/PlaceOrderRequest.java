package com.coreman.dto.request;

import com.coreman.model.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record PlaceOrderRequest(
        @NotNull Long shippingAddressId,
        /** Optional; defaults to Cash on Delivery. */
        PaymentMethod paymentMethod
) {}
