package com.coreman.service;

/** Bangladeshi mobile numbers: 01XXXXXXXXX, with or without +88 / 88, spaces or dashes. */
public final class Phones {
    private Phones() {}

    /** Returns the 11-digit 01XXXXXXXXX form, or null if it isn't a valid BD mobile number. */
    public static String normalize(String raw) {
        if (raw == null) return null;
        String d = raw.replaceAll("\\D", "");
        if (d.startsWith("880") && d.length() == 13) d = d.substring(2);
        else if (d.startsWith("88") && d.length() == 13) d = d.substring(2);
        return d.matches("01[3-9]\\d{8}") ? d : null;
    }
}
