package com.coreman.config;

import com.coreman.model.*;
import com.coreman.model.enums.Gender;
import com.coreman.model.enums.Role;
import com.coreman.repository.CategoryRepository;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        log.info("[SEED] Seeding database with sample data...");

        // Admin user
        userRepository.save(User.builder()
                .email("admin@coreman.com").passwordHash(passwordEncoder.encode("admin123"))
                .firstName("Admin").lastName("CoreMan").role(Role.ADMIN).build());

        // Demo customer
        userRepository.save(User.builder()
                .email("demo@coreman.com").passwordHash(passwordEncoder.encode("demo123"))
                .firstName("Demo").lastName("User").role(Role.CUSTOMER).build());

        // Categories
        Category menswear = categoryRepository.save(Category.builder().name("Menswear").slug("menswear")
                .description("Premium men's clothing").displayOrder(1)
                .imageUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600").build());
        Category womenswear = categoryRepository.save(Category.builder().name("Womenswear").slug("womenswear")
                .description("Curated women's fashion").displayOrder(2)
                .imageUrl("https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600").build());
        Category tshirts = categoryRepository.save(Category.builder().name("T-Shirts").slug("t-shirts")
                .description("Essential tees").parent(menswear).displayOrder(1)
                .imageUrl("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600").build());
        Category jackets = categoryRepository.save(Category.builder().name("Jackets").slug("jackets")
                .description("Outerwear essentials").parent(menswear).displayOrder(2)
                .imageUrl("https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600").build());
        Category dresses = categoryRepository.save(Category.builder().name("Dresses").slug("dresses")
                .description("Elegant dresses").parent(womenswear).displayOrder(1)
                .imageUrl("https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600").build());
        Category accessories = categoryRepository.save(Category.builder().name("Accessories").slug("accessories")
                .description("Complete your look").displayOrder(3)
                .imageUrl("https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600").build());
        Category lifestyle = categoryRepository.save(Category.builder().name("Lifestyle").slug("lifestyle")
                .description("Beyond fashion").displayOrder(4)
                .imageUrl("https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600").build());

        // Products
        seedProduct("Essential Cotton Crew Tee", "essential-cotton-crew-tee",
                "Premium 100% organic cotton crew neck. Pre-shrunk, garment-dyed for a lived-in feel.",
                new BigDecimal("39.99"), tshirts, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
                        "https://images.unsplash.com/photo-1622445275576-721325763afe?w=800"),
                List.of(
                        variant("S", "White", "#FFFFFF", "CM-TEE-WHT-S", 25),
                        variant("M", "White", "#FFFFFF", "CM-TEE-WHT-M", 40),
                        variant("L", "White", "#FFFFFF", "CM-TEE-WHT-L", 35),
                        variant("XL", "White", "#FFFFFF", "CM-TEE-WHT-XL", 20),
                        variant("S", "Black", "#000000", "CM-TEE-BLK-S", 30),
                        variant("M", "Black", "#000000", "CM-TEE-BLK-M", 45),
                        variant("L", "Black", "#000000", "CM-TEE-BLK-L", 38),
                        variant("M", "Navy", "#1B2A4A", "CM-TEE-NVY-M", 22)
                ));

        seedProduct("Heritage Bomber Jacket", "heritage-bomber-jacket",
                "Military-inspired bomber in water-resistant nylon with quilted lining. Ribbed cuffs and hem.",
                new BigDecimal("189.99"), jackets, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
                        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800"),
                List.of(
                        variant("S", "Olive", "#556B2F", "CM-BMB-OLV-S", 12),
                        variant("M", "Olive", "#556B2F", "CM-BMB-OLV-M", 18),
                        variant("L", "Olive", "#556B2F", "CM-BMB-OLV-L", 15),
                        variant("M", "Black", "#000000", "CM-BMB-BLK-M", 20),
                        variant("L", "Black", "#000000", "CM-BMB-BLK-L", 16)
                ));

        seedProduct("Silk Midi Dress", "silk-midi-dress",
                "Flowing silk midi dress with adjustable waist tie. Perfect for both office and evening.",
                new BigDecimal("149.99"), dresses, "CoreMan", Gender.WOMEN, true,
                List.of("https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800"),
                List.of(
                        variant("XS", "Burgundy", "#800020", "CM-DRS-BRG-XS", 8),
                        variant("S", "Burgundy", "#800020", "CM-DRS-BRG-S", 14),
                        variant("M", "Burgundy", "#800020", "CM-DRS-BRG-M", 18),
                        variant("S", "Ivory", "#FFFFF0", "CM-DRS-IVR-S", 10),
                        variant("M", "Ivory", "#FFFFF0", "CM-DRS-IVR-M", 12)
                ));

        seedProduct("Oversized Hoodie", "oversized-hoodie",
                "Ultra-soft heavyweight fleece hoodie with dropped shoulders and kangaroo pocket.",
                new BigDecimal("79.99"), tshirts, "CoreMan", Gender.UNISEX, true,
                List.of("https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800"),
                List.of(
                        variant("S", "Charcoal", "#36454F", "CM-HOD-CHR-S", 20),
                        variant("M", "Charcoal", "#36454F", "CM-HOD-CHR-M", 30),
                        variant("L", "Charcoal", "#36454F", "CM-HOD-CHR-L", 25),
                        variant("M", "Cream", "#FFFDD0", "CM-HOD-CRM-M", 15),
                        variant("L", "Cream", "#FFFDD0", "CM-HOD-CRM-L", 18)
                ));

        seedProduct("Slim Fit Chinos", "slim-fit-chinos",
                "Tailored slim fit chinos in stretch cotton twill. Versatile enough for work or weekend.",
                new BigDecimal("69.99"), menswear, "CoreMan", Gender.MEN, false,
                List.of("https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800"),
                List.of(
                        variant("30", "Khaki", "#C3B091", "CM-CHI-KHK-30", 20),
                        variant("32", "Khaki", "#C3B091", "CM-CHI-KHK-32", 28),
                        variant("34", "Khaki", "#C3B091", "CM-CHI-KHK-34", 22),
                        variant("32", "Navy", "#1B2A4A", "CM-CHI-NVY-32", 18),
                        variant("34", "Navy", "#1B2A4A", "CM-CHI-NVY-34", 15)
                ));

        seedProduct("Leather Minimalist Watch", "leather-minimalist-watch",
                "Japanese quartz movement with Italian leather strap. 40mm case, sapphire crystal.",
                new BigDecimal("129.99"), accessories, "CoreMan", Gender.UNISEX, true,
                List.of("https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800"),
                List.of(
                        variant("One Size", "Brown", "#8B4513", "CM-WCH-BRN-OS", 30),
                        variant("One Size", "Black", "#000000", "CM-WCH-BLK-OS", 25)
                ));

        seedProduct("Scented Candle Set", "scented-candle-set",
                "Hand-poured soy wax candles in three signature scents: Cedar, Bergamot, and Amber.",
                new BigDecimal("49.99"), lifestyle, "CoreMan Home", Gender.UNISEX, true,
                List.of("https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800"),
                List.of(
                        variant("Set of 3", "Natural", "#F5F5DC", "CM-CND-NAT-3", 40)
                ));

        seedProduct("Wool Blend Overcoat", "wool-blend-overcoat",
                "Timeless double-breasted overcoat in Italian wool blend. Fully lined with peak lapels.",
                new BigDecimal("349.99"), jackets, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1544923246-77307dd270b2?w=800"),
                List.of(
                        variant("S", "Camel", "#C19A6B", "CM-OVC-CML-S", 8),
                        variant("M", "Camel", "#C19A6B", "CM-OVC-CML-M", 12),
                        variant("L", "Camel", "#C19A6B", "CM-OVC-CML-L", 10),
                        variant("M", "Charcoal", "#36454F", "CM-OVC-CHR-M", 10),
                        variant("L", "Charcoal", "#36454F", "CM-OVC-CHR-L", 8)
                ));

        log.info("[SEED] Database seeded with {} products", productRepository.count());
    }

    private record VariantData(String size, String color, String colorHex, String sku, int stock) {}
    private VariantData variant(String size, String color, String hex, String sku, int stock) {
        return new VariantData(size, color, hex, sku, stock);
    }

    private void seedProduct(String name, String slug, String desc, BigDecimal price,
                              Category category, String brand, Gender gender, boolean featured,
                              List<String> imageUrls, List<VariantData> variantData) {
        Product product = Product.builder()
                .name(name).slug(slug).description(desc).basePrice(price)
                .category(category).brand(brand).gender(gender)
                .isActive(true).isFeatured(featured).build();

        for (int i = 0; i < imageUrls.size(); i++) {
            product.getImages().add(ProductImage.builder()
                    .product(product).imageUrl(imageUrls.get(i))
                    .displayOrder(i).isPrimary(i == 0).build());
        }

        for (VariantData v : variantData) {
            product.getVariants().add(ProductVariant.builder()
                    .product(product).size(v.size()).color(v.color())
                    .colorHex(v.colorHex()).sku(v.sku())
                    .stockQuantity(v.stock()).build());
        }

        productRepository.save(product);
    }
}
