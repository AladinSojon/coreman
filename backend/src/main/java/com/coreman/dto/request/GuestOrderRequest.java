package com.coreman.dto.request;

import com.coreman.model.enums.PaymentMethod;

import java.util.List;

/** Checkout without an account: the cart lines plus delivery details. Prices are always taken from the database. */
public record GuestOrderRequest(
        List<Item> items,
        String recipientName,
        String phone,
        String street,
        String city,
        String zipCode,
        PaymentMethod paymentMethod
) {
    public record Item(Long variantId, Integer quantity) {}
}
