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

        // Categories — Men only for now
        Category menswear = categoryRepository.save(Category.builder().name("Menswear").slug("menswear")
                .description("Premium men's clothing").displayOrder(1)
                .imageUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600").build());
        Category dropShoulder = categoryRepository.save(Category.builder().name("Drop Shoulder T-Shirts").slug("drop-shoulder-tshirts")
                .description("Relaxed fit drop shoulder tees").parent(menswear).displayOrder(1)
                .imageUrl("https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600").build());

        // Drop Shoulder T-Shirts — Men
        seedProduct("Heavyweight Drop Shoulder Tee", "heavyweight-drop-shoulder-tee",
                "Premium 280GSM cotton drop shoulder tee with a boxy, relaxed silhouette. Ribbed crew neck, reinforced seams, and a slightly oversized fit for that effortlessly cool streetwear look.",
                new BigDecimal("44.99"), dropShoulder, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800",
                        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800"),
                List.of(
                        variant("S", "Black", "#000000", "CM-DS-BLK-S", 30),
                        variant("M", "Black", "#000000", "CM-DS-BLK-M", 50),
                        variant("L", "Black", "#000000", "CM-DS-BLK-L", 45),
                        variant("XL", "Black", "#000000", "CM-DS-BLK-XL", 25),
                        variant("S", "White", "#FFFFFF", "CM-DS-WHT-S", 28),
                        variant("M", "White", "#FFFFFF", "CM-DS-WHT-M", 42),
                        variant("L", "White", "#FFFFFF", "CM-DS-WHT-L", 38),
                        variant("XL", "White", "#FFFFFF", "CM-DS-WHT-XL", 20)
                ));

        seedProduct("Washed Drop Shoulder Tee", "washed-drop-shoulder-tee",
                "Garment-washed for a vintage, lived-in feel. Dropped shoulders with extended sleeves, raw-cut hem, and ultra-soft 240GSM cotton. The go-to everyday tee.",
                new BigDecimal("39.99"), dropShoulder, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800",
                        "https://images.unsplash.com/photo-1622445275576-721325763afe?w=800"),
                List.of(
                        variant("S", "Washed Grey", "#8C8C8C", "CM-WDS-GRY-S", 22),
                        variant("M", "Washed Grey", "#8C8C8C", "CM-WDS-GRY-M", 35),
                        variant("L", "Washed Grey", "#8C8C8C", "CM-WDS-GRY-L", 30),
                        variant("XL", "Washed Grey", "#8C8C8C", "CM-WDS-GRY-XL", 18),
                        variant("M", "Dusty Rose", "#DCAE96", "CM-WDS-RSE-M", 20),
                        variant("L", "Dusty Rose", "#DCAE96", "CM-WDS-RSE-L", 15)
                ));

        seedProduct("Oversized Drop Shoulder Graphic Tee", "oversized-drop-shoulder-graphic-tee",
                "Statement graphic on heavyweight 300GSM cotton. Ultra-dropped shoulders, boxy cropped body, and a textured screen print that won't crack or fade.",
                new BigDecimal("54.99"), dropShoulder, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
                        "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800"),
                List.of(
                        variant("S", "Off White", "#FAF0E6", "CM-GDS-OWH-S", 15),
                        variant("M", "Off White", "#FAF0E6", "CM-GDS-OWH-M", 28),
                        variant("L", "Off White", "#FAF0E6", "CM-GDS-OWH-L", 25),
                        variant("XL", "Off White", "#FAF0E6", "CM-GDS-OWH-XL", 12),
                        variant("M", "Black", "#000000", "CM-GDS-BLK-M", 30),
                        variant("L", "Black", "#000000", "CM-GDS-BLK-L", 22)
                ));

        seedProduct("Ribbed Drop Shoulder Tee", "ribbed-drop-shoulder-tee",
                "Textured ribbed knit in a drop shoulder silhouette. Slim-through-body fit with relaxed shoulders for a modern contrast. 260GSM premium cotton blend.",
                new BigDecimal("49.99"), dropShoulder, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800"),
                List.of(
                        variant("S", "Olive", "#556B2F", "CM-RDS-OLV-S", 18),
                        variant("M", "Olive", "#556B2F", "CM-RDS-OLV-M", 30),
                        variant("L", "Olive", "#556B2F", "CM-RDS-OLV-L", 25),
                        variant("XL", "Olive", "#556B2F", "CM-RDS-OLV-XL", 14),
                        variant("S", "Navy", "#1B2A4A", "CM-RDS-NVY-S", 16),
                        variant("M", "Navy", "#1B2A4A", "CM-RDS-NVY-M", 28),
                        variant("L", "Navy", "#1B2A4A", "CM-RDS-NVY-L", 20)
                ));

        seedProduct("Drop Shoulder Pocket Tee", "drop-shoulder-pocket-tee",
                "Clean minimal design with a single chest pocket detail. Dropped shoulders, relaxed body, and a curved hem. 250GSM organic cotton, pre-shrunk.",
                new BigDecimal("42.99"), dropShoulder, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800",
                        "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800"),
                List.of(
                        variant("S", "Sand", "#C2B280", "CM-PDS-SND-S", 20),
                        variant("M", "Sand", "#C2B280", "CM-PDS-SND-M", 35),
                        variant("L", "Sand", "#C2B280", "CM-PDS-SND-L", 28),
                        variant("XL", "Sand", "#C2B280", "CM-PDS-SND-XL", 15),
                        variant("S", "Charcoal", "#36454F", "CM-PDS-CHR-S", 22),
                        variant("M", "Charcoal", "#36454F", "CM-PDS-CHR-M", 38),
                        variant("L", "Charcoal", "#36454F", "CM-PDS-CHR-L", 30),
                        variant("XL", "Charcoal", "#36454F", "CM-PDS-CHR-XL", 18)
                ));

        seedProduct("Acid Wash Drop Shoulder Tee", "acid-wash-drop-shoulder-tee",
                "Bold acid wash finish on premium heavyweight cotton. Each piece is unique with one-of-a-kind wash patterns. Dropped shoulders, raw edges, and a lived-in vibe.",
                new BigDecimal("59.99"), dropShoulder, "CoreMan", Gender.MEN, true,
                List.of("https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800"),
                List.of(
                        variant("S", "Acid Black", "#2C2C2C", "CM-ADS-ABK-S", 12),
                        variant("M", "Acid Black", "#2C2C2C", "CM-ADS-ABK-M", 20),
                        variant("L", "Acid Black", "#2C2C2C", "CM-ADS-ABK-L", 18),
                        variant("XL", "Acid Black", "#2C2C2C", "CM-ADS-ABK-XL", 10),
                        variant("M", "Acid Blue", "#4A6FA5", "CM-ADS-ABL-M", 15),
                        variant("L", "Acid Blue", "#4A6FA5", "CM-ADS-ABL-L", 12)
                ));

        log.info("[SEED] Database seeded with {} drop shoulder t-shirts", productRepository.count());
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
