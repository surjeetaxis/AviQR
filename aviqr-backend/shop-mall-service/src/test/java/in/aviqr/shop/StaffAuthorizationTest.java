package in.aviqr.shop;
import in.aviqr.shop.controller.StaffController;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class StaffAuthorizationTest {
    @Test void callerCannotModifyAnotherShopsStaff() {
        var staffRepo=mock(StaffRepository.class);var shops=mock(ShopRepository.class);var controller=new StaffController(staffRepo,shops);
        var staff=ShopStaff.builder().id(UUID.randomUUID()).shopId(UUID.randomUUID()).name("Staff").build();
        when(staffRepo.findById(staff.getId())).thenReturn(Optional.of(staff));
        assertThat(controller.updateStaff(staff.getId(),ShopStaff.builder().name("Changed").build(),"attacker","OWNER",UUID.randomUUID().toString()).getStatusCode().value()).isEqualTo(403);
        assertThat(controller.removeStaff(staff.getId(),"attacker","MANAGER",UUID.randomUUID().toString()).getStatusCode().value()).isEqualTo(403);
        assertThat(controller.changeRole(staff.getId(),"MANAGER","attacker","CUSTOMER",staff.getShopId().toString()).getStatusCode().value()).isEqualTo(403);
        assertThat(staff.getName()).isEqualTo("Staff");verify(staffRepo,never()).save(any());
    }
    @Test void owningUserCanManageStaffAndCannotOverwriteExistingRowOnCreate() {
        var staffRepo=mock(StaffRepository.class);var shops=mock(ShopRepository.class);var controller=new StaffController(staffRepo,shops);
        var shop=Shop.builder().id(UUID.randomUUID()).ownerId("owner").build();when(shops.findById(shop.getId())).thenReturn(Optional.of(shop));
        when(staffRepo.save(any())).thenAnswer(inv->inv.getArgument(0));
        var request=ShopStaff.builder().id(UUID.randomUUID()).name("New staff").build();
        assertThat(controller.addStaff(shop.getId(),request,"owner","OWNER","").getStatusCode().value()).isEqualTo(200);
        assertThat(request.getId()).isNull();assertThat(request.getShopId()).isEqualTo(shop.getId());
    }
}
