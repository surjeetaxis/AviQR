package in.aviqr.review.service;

import in.aviqr.review.dto.*;
import in.aviqr.review.entity.Review;
import in.aviqr.review.repository.ReviewRepository;
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
        Review review = Review.builder()
            .shopId(req.getShopId()).menuItemId(req.getMenuItemId()).orderId(req.getOrderId())
            .customerId(customerId).customerName(req.getCustomerName())
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

    private ReviewResponse toDto(Review r) {
        ReviewResponse dto = new ReviewResponse();
        dto.setId(r.getId()); dto.setShopId(r.getShopId()); dto.setMenuItemId(r.getMenuItemId());
        dto.setOrderId(r.getOrderId()); dto.setCustomerId(r.getCustomerId()); dto.setCustomerName(r.getCustomerName());
        dto.setRating(r.getRating()); dto.setComment(r.getComment()); dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
