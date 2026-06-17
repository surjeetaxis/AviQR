package in.aviqr.report.dto;
import lombok.*;
@Data @AllArgsConstructor @NoArgsConstructor
public class ApiResponse<T> {
    boolean success; String message; T data;
    public static <T> ApiResponse<T> ok(T d) { return new ApiResponse<>(true,"Success",d); }
    public static <T> ApiResponse<T> ok(String m, T d) { return new ApiResponse<>(true,m,d); }
}