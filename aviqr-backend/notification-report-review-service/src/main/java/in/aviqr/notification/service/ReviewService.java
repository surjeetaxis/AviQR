package in.aviqr.notification.service;

import in.aviqr.notification.dto.*;
import in.aviqr.notification.entity.Review;
import in.aviqr.notification.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository repo;

    @Transactional
    public ReviewResponse submit(String customerId, ReviewRequest req) {
        if ((req.getShopId() == null || req.getShopId().isBlank())
                && (req.getHotelId() == null || req.getHotelId().isBlank()))
            throw new RuntimeException("Either shopId or hotelId is required");
        Review review = Review.builder()
            .shopId(req.getShopId()).menuItemId(req.getMenuItemId()).orderId(req.getOrderId())
            .hotelId(req.getHotelId()).reservationId(req.getReservationId())
            .customerId(customerId).customerName(req.getCustomerName())
            .rating(req.getRating()).comment(req.getComment()).build();
        return toDto(repo.save(review));
    }

    // Public, unauthenticated: a hotel guest reached via a post-checkout link has no
    // AviQR login (contactless check-in never required one either) — identity is
    // proven by knowing the reservationId, same trust level as that existing flow.
    // One review per stay: a reservationId that's already reviewed is rejected.
    @Transactional
    public ReviewResponse submitHotelStay(ReviewRequest req) {
        if (req.getHotelId() == null || req.getHotelId().isBlank())
            throw new RuntimeException("hotelId is required");
        if (req.getReservationId() == null)
            throw new RuntimeException("reservationId is required");
        if (repo.existsByReservationId(req.getReservationId()))
            throw new RuntimeException("This stay has already been reviewed");
        Review review = Review.builder()
            .hotelId(req.getHotelId()).reservationId(req.getReservationId())
            .customerId(req.getReservationId().toString()).customerName(req.getCustomerName())
            .rating(req.getRating()).comment(req.getComment()).build();
        return toDto(repo.save(review));
    }

    public Page<ReviewResponse> byShop(String shopId, Pageable pageable) {
        return repo.findByShopIdOrderByCreatedAtDesc(shopId, pageable).map(this::toDto);
    }

    public Page<ReviewResponse> byMenuItem(UUID menuItemId, Pageable pageable) {
        return repo.findByMenuItemIdOrderByCreatedAtDesc(menuItemId, pageable).map(this::toDto);
    }

    public Page<ReviewResponse> byCustomer(String customerId, Pageable pageable) {
        return repo.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable).map(this::toDto);
    }

    public RatingSummary shopSummary(String shopId) {
        return new RatingSummary(repo.averageRatingForShop(shopId), repo.countForShop(shopId));
    }

    public RatingSummary menuItemSummary(UUID menuItemId) {
        return new RatingSummary(repo.averageRatingForMenuItem(menuItemId), repo.countForMenuItem(menuItemId));
    }

    public Page<ReviewResponse> byHotel(String hotelId, Pageable pageable) {
        return repo.findByHotelIdOrderByCreatedAtDesc(hotelId, pageable).map(this::toDto);
    }

    public RatingSummary hotelSummary(String hotelId) {
        return new RatingSummary(repo.averageRatingForHotel(hotelId), repo.countForHotel(hotelId));
    }

    private ReviewResponse toDto(Review r) {
        ReviewResponse dto = new ReviewResponse();
        dto.setId(r.getId()); dto.setShopId(r.getShopId()); dto.setMenuItemId(r.getMenuItemId());
        dto.setOrderId(r.getOrderId()); dto.setHotelId(r.getHotelId()); dto.setReservationId(r.getReservationId());
        dto.setCustomerId(r.getCustomerId()); dto.setCustomerName(r.getCustomerName());
        dto.setRating(r.getRating()); dto.setComment(r.getComment()); dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
