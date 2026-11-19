package com.coreman.config;

import com.coreman.model.Category;
import com.coreman.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Makes sure the store's standard category tree exists.
 *
 * Safe to run on every start and on a live database: it only INSERTS categories whose slug is missing.
 * Existing categories are never renamed, moved, re-imaged or deleted, so anything edited in the admin
 * panel is left alone. Disable with SEED_CATEGORIES=false.
 */
@Slf4j
@Component
@Order(1) // before DataSeeder, which puts sample products into these categories
@RequiredArgsConstructor
public class CategorySeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final JdbcTemplate jdbcTemplate;

    @Value("${coreman.seed-categories:true}")
    private boolean enabled;

    private static final String IMG = "https://images.unsplash.com/";

    /** name, slug, description, image (nullable), children */
    record Node(String name, String slug, String description, String image, List<Node> children) {
        Node(String name, String slug, String description, String image) {
            this(name, slug, description, image, List.of());
        }
    }

    static final List<Node> TREE = List.of(
            new Node("Menswear", "menswear", "Everyday essentials and statement pieces for men.",
                    IMG + "photo-1507003211169-0a1dd7228f2d?w=600", List.of(
                    new Node("T-Shirts", "t-shirt", "Heavyweight cotton tees in relaxed and classic fits.",
                            IMG + "photo-1521572163474-6864f9cf17ab?w=600", List.of(
                            new Node("Drop Shoulder Tees", "drop-shoulder-tshirts", "Boxy, relaxed tees with dropped shoulders.",
                                    IMG + "photo-1576566588028-4147f3842f27?w=600"),
                            new Node("Graphic Tees", "graphic-tees", "Printed tees with original artwork.",
                                    IMG + "photo-1583743814966-8936f5b7be1a?w=600"),
                            new Node("Essential Tees", "essential-tees", "Clean, plain tees for every day.",
                                    IMG + "photo-1586790170083-2f9ceadc732d?w=600"))),
                    new Node("Polo Shirts", "polo-shirts", "Piqué and knit polos, smart enough for the office.", null),
                    new Node("Shirts", "shirts", "Oxford, linen and casual shirts.",
                            IMG + "photo-1602810318383-e386cc2a3ccf?w=600"),
                    new Node("Hoodies & Sweatshirts", "hoodies-sweatshirts", "Fleece-backed layers for cooler days.",
                            IMG + "photo-1556821840-3a63f95609a7?w=600"),
                    new Node("Sweaters", "sweaters", "Crewnecks and knits for winter.",
                            IMG + "photo-1614975059251-992f11792b9f?w=600"),
                    new Node("Jackets & Coats", "jackets-coats", "Bombers, overshirts and outerwear.",
                            IMG + "photo-1591047139829-d91aecb6caea?w=600"),
                    new Node("Jeans", "jeans", "Slim, straight and relaxed denim.",
                            IMG + "photo-1542272604-787c3835535d?w=600"),
                    new Node("Pants & Chinos", "pants-chinos", "Chinos and tailored trousers.",
                            IMG + "photo-1473966968600-fa801b869a1a?w=600"),
                    new Node("Joggers & Trackpants", "joggers", "Comfortable joggers for home, gym and travel.",
                            IMG + "photo-1624378439575-d8705ad7ae80?w=600"),
                    new Node("Shorts", "shorts", "Cotton, denim and active shorts.", null))),

            new Node("Womenswear", "womenswear", "Modern essentials and occasion wear for women.",
                    IMG + "photo-1483985988355-763728e1935b?w=600", List.of(
                    new Node("Tops & Blouses", "tops-blouses", "Everyday tops, blouses and crop tops.",
                            IMG + "photo-1564257631407-4deb1f99d992?w=600"),
                    new Node("T-Shirts", "women-tshirts", "Relaxed, oversized and fitted tees.",
                            IMG + "photo-1554568218-0f1715e72254?w=600"),
                    new Node("Shirts", "women-shirts", "Button-downs and oversized shirts.",
                            IMG + "photo-1598554747436-c9293d6a588f?w=600"),
                    new Node("Dresses", "dresses", "Midi, maxi and casual dresses.",
                            IMG + "photo-1595777457583-95e059d581b8?w=600"),
                    new Node("Co-ord Sets", "coord-sets", "Matching sets, ready to wear together.",
                            IMG + "photo-1515372039744-b8f02a3ae446?w=600"),
                    new Node("Knitwear", "knitwear", "Cardigans, sweaters and knit tops.",
                            IMG + "photo-1434389677669-e08b4cac3105?w=600"),
                    new Node("Hoodies & Sweatshirts", "women-hoodies-sweatshirts", "Cosy layers in soft fleece.",
                            IMG + "photo-1578681994506-b8f463449011?w=600"),
                    new Node("Jackets & Coats", "jackets-coats-women", "Trench coats, blazers and jackets.",
                            IMG + "photo-1539533018447-63fcce2678e3?w=600"),
                    new Node("Jeans", "women-jeans", "Mom, wide-leg and skinny denim.",
                            IMG + "photo-1541099649105-f69ad21f3246?w=600"),
                    new Node("Pants & Trousers", "pants-trousers", "Wide-leg trousers, joggers and pants.",
                            IMG + "photo-1594633312681-425c7b97ccd1?w=600"),
                    new Node("Skirts", "skirts", "Mini, midi and pleated skirts.",
                            IMG + "photo-1583496661160-fb5886a0aaaa?w=600"))),

            new Node("Accessories", "accessories", "The finishing touches.",
                    IMG + "photo-1511499767150-a48a237f0083?w=600", List.of(
                    new Node("Caps & Hats", "caps-hats", "Baseball caps, bucket hats and beanies.",
                            IMG + "photo-1588850561407-ed78c282e89b?w=600"),
                    new Node("Bags", "bags", "Backpacks, totes and crossbody bags.",
                            IMG + "photo-1553062407-98eeb64c6a62?w=600"),
                    new Node("Belts", "belts", "Leather and canvas belts.",
                            IMG + "photo-1624222247344-550fb60583dc?w=600"),
                    new Node("Socks", "socks", "Everyday and statement socks.",
                            IMG + "photo-1586350977771-b3b0abd50c82?w=600"),
                    new Node("Sunglasses", "sunglasses", "Frames for sunny days.",
                            IMG + "photo-1511499767150-a48a237f0083?w=600")))
    );

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("[SEED] Category seeding disabled (SEED_CATEGORIES=false)");
            return;
        }
        allowDuplicateCategoryNames();

        int[] created = {0};
        for (int i = 0; i < TREE.size(); i++) {
            ensure(TREE.get(i), null, i + 1, created);
        }
        if (created[0] > 0) log.info("[SEED] Added {} missing categories", created[0]);
    }

    private void ensure(Node node, Category parent, int order, int[] created) {
        Category category = categoryRepository.findBySlug(node.slug()).orElse(null);
        if (category == null) {
            category = categoryRepository.save(Category.builder()
                    .name(node.name()).slug(node.slug()).description(node.description())
                    .imageUrl(node.image()).parent(parent).displayOrder(order)
                    .build());
            created[0]++;
        }
        for (int i = 0; i < node.children().size(); i++) {
            ensure(node.children().get(i), category, i + 1, created);
        }
    }

    /**
     * Category names used to be UNIQUE, which made "Jeans" impossible under both Men and Women.
     * The slug is the real identifier, so drop the single-column unique constraint on name (PostgreSQL).
     */
    private void allowDuplicateCategoryNames() {
        try {
            List<String> constraints = jdbcTemplate.queryForList("""
                    SELECT con.conname FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = con.conkey[1]
                    WHERE rel.relname = 'categories' AND con.contype = 'u'
                      AND array_length(con.conkey, 1) = 1 AND att.attname = 'name'
                    """, String.class);
            for (String name : constraints) {
                jdbcTemplate.execute("ALTER TABLE categories DROP CONSTRAINT \"" + name.replace("\"", "") + "\"");
                log.info("[SEED] Dropped unique constraint {} on categories.name", name);
            }
        } catch (Exception e) {
            log.warn("[SEED] Could not check categories.name constraint: {}", e.getMessage());
        }
    }
}
