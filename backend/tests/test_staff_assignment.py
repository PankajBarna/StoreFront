"""
Backend API Tests for Staff Assignment Feature
Tests: Staff CRUD, Staff assignment on booking confirmation, Staff update on confirmed bookings
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SALON_ADMIN = {"email": "admin@glowbeauty.com", "password": "admin123"}
PLATFORM_ADMIN = {"email": "platform@admin.com", "password": "platform123"}


@pytest.fixture(scope="module")
def salon_token():
    """Get salon admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SALON_ADMIN)
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def platform_token():
    """Get platform admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_ADMIN)
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(scope="module", autouse=True)
def ensure_booking_enabled(platform_token):
    """Ensure booking calendar is enabled for all tests"""
    requests.patch(f"{BASE_URL}/api/admin/features", 
        headers={"Authorization": f"Bearer {platform_token}"},
        json={"booking_calendar_enabled": True}
    )


class TestStaffEndpoint:
    """Tests for GET /api/staff endpoint"""
    
    def test_get_staff_returns_list(self):
        """Test that GET /api/staff returns a list of staff members"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Staff endpoint returns list with {len(data)} members")
    
    def test_get_staff_returns_3_preseeded_staff(self):
        """Test that GET /api/staff returns 3 pre-seeded staff members"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3, f"Expected at least 3 staff, got {len(data)}"
        
        # Verify expected staff members exist
        staff_names = [s["name"] for s in data]
        expected_names = ["Priya Sharma", "Neha Patel", "Anjali Singh"]
        for name in expected_names:
            assert name in staff_names, f"Expected staff '{name}' not found"
        print(f"✓ Found all 3 pre-seeded staff: {expected_names}")
    
    def test_staff_has_required_fields(self):
        """Test that staff members have all required fields"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["id", "name", "role", "active"]
        for staff in data:
            for field in required_fields:
                assert field in staff, f"Staff missing required field: {field}"
        print(f"✓ All staff have required fields: {required_fields}")
    
    def test_staff_ids_match_expected(self):
        """Test that staff IDs match expected values"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        data = response.json()
        
        staff_by_id = {s["id"]: s["name"] for s in data}
        expected_ids = {
            "staff-1": "Priya Sharma",
            "staff-2": "Neha Patel", 
            "staff-3": "Anjali Singh"
        }
        
        for staff_id, expected_name in expected_ids.items():
            assert staff_id in staff_by_id, f"Staff ID {staff_id} not found"
            assert staff_by_id[staff_id] == expected_name, f"Staff {staff_id} name mismatch"
        print(f"✓ Staff IDs match expected: {list(expected_ids.keys())}")


class TestStaffAssignmentOnConfirm:
    """Tests for staff assignment when confirming a pending booking"""
    
    def test_confirm_booking_with_staff_assignment(self, salon_token, platform_token):
        """Test confirming a pending booking with staff assignment"""
        # Create a new pending booking
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service = services[0]
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        avail_res = requests.get(f"{BASE_URL}/api/public/availability?serviceId={service['id']}&date={tomorrow}")
        slots = avail_res.json().get("slots", [])
        
        if len(slots) == 0:
            pytest.skip("No available slots for testing")
        
        # Create booking
        booking_data = {
            "serviceId": service["id"],
            "clientName": "TEST_StaffAssign_Confirm",
            "clientPhone": "9876543299",
            "startTime": slots[0]["startTime"],
            "notes": "Test staff assignment on confirm"
        }
        
        create_res = requests.post(f"{BASE_URL}/api/public/bookings", json=booking_data)
        assert create_res.status_code == 200
        booking_id = create_res.json()["booking"]["id"]
        
        # Confirm with staff assignment
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/status",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={"status": "confirmed", "staffId": "staff-1"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"
        assert data["staffId"] == "staff-1"
        assert data["staffName"] == "Priya Sharma"
        print(f"✓ Booking {booking_id} confirmed with staff-1 (Priya Sharma)")
    
    def test_confirm_booking_without_staff(self, salon_token, platform_token):
        """Test confirming a pending booking without staff assignment"""
        # Create a new pending booking
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service = services[0]
        
        day_after = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        avail_res = requests.get(f"{BASE_URL}/api/public/availability?serviceId={service['id']}&date={day_after}")
        slots = avail_res.json().get("slots", [])
        
        if len(slots) == 0:
            pytest.skip("No available slots for testing")
        
        # Create booking
        booking_data = {
            "serviceId": service["id"],
            "clientName": "TEST_NoStaff_Confirm",
            "clientPhone": "9876543298",
            "startTime": slots[0]["startTime"],
            "notes": "Test confirm without staff"
        }
        
        create_res = requests.post(f"{BASE_URL}/api/public/bookings", json=booking_data)
        assert create_res.status_code == 200
        booking_id = create_res.json()["booking"]["id"]
        
        # Confirm without staff
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/status",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={"status": "confirmed"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"
        assert data.get("staffId") is None
        assert data.get("staffName") is None
        print(f"✓ Booking {booking_id} confirmed without staff assignment")


class TestStaffAssignmentUpdate:
    """Tests for updating staff assignment on confirmed bookings"""
    
    def test_update_staff_on_confirmed_booking(self, salon_token):
        """Test updating staff assignment on an already confirmed booking"""
        # Get a confirmed booking
        bookings_res = requests.get(
            f"{BASE_URL}/api/salon/bookings",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        bookings = bookings_res.json()["bookings"]
        
        # Find a confirmed booking
        confirmed_booking = next(
            (b for b in bookings if b["status"] == "confirmed"),
            None
        )
        
        if not confirmed_booking:
            pytest.skip("No confirmed booking available for testing")
        
        booking_id = confirmed_booking["id"]
        original_staff = confirmed_booking.get("staffId")
        
        # Update to staff-2
        new_staff_id = "staff-2" if original_staff != "staff-2" else "staff-3"
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/status",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={"status": "confirmed", "staffId": new_staff_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["staffId"] == new_staff_id
        assert data["staffName"] is not None
        print(f"✓ Booking {booking_id} staff updated from {original_staff} to {new_staff_id}")
    
    def test_staff_change_logged_in_audit(self, salon_token):
        """Test that staff changes are logged in booking audit history"""
        # Get a confirmed booking
        bookings_res = requests.get(
            f"{BASE_URL}/api/salon/bookings",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        bookings = bookings_res.json()["bookings"]
        
        confirmed_booking = next(
            (b for b in bookings if b["status"] == "confirmed"),
            None
        )
        
        if not confirmed_booking:
            pytest.skip("No confirmed booking available for testing")
        
        booking_id = confirmed_booking["id"]
        
        # Update staff
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/status",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={"status": "confirmed", "staffId": "staff-1"}
        )
        assert response.status_code == 200
        
        # Check audit log
        changes_res = requests.get(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/changes",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        assert changes_res.status_code == 200
        changes = changes_res.json()["changes"]
        
        # Verify staff change is logged
        staff_changes = [c for c in changes if c.get("newStaffId") is not None]
        assert len(staff_changes) > 0, "Staff change not logged in audit"
        print(f"✓ Staff changes logged in audit: {len(staff_changes)} records")


class TestStaffNameInBookingList:
    """Tests for staffName display in booking list"""
    
    def test_booking_list_includes_staff_name(self, salon_token):
        """Test that booking list includes staffName for assigned bookings"""
        response = requests.get(
            f"{BASE_URL}/api/salon/bookings",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        assert response.status_code == 200
        bookings = response.json()["bookings"]
        
        # Find bookings with staff assigned
        bookings_with_staff = [b for b in bookings if b.get("staffId")]
        
        if len(bookings_with_staff) == 0:
            pytest.skip("No bookings with staff assignment")
        
        for booking in bookings_with_staff:
            assert "staffName" in booking, f"Booking {booking['id']} missing staffName"
            assert booking["staffName"] is not None, f"Booking {booking['id']} has null staffName"
        
        print(f"✓ {len(bookings_with_staff)} bookings have staffName populated")
    
    def test_booking_detail_includes_staff_info(self, salon_token):
        """Test that booking detail includes staff info"""
        # Get bookings
        bookings_res = requests.get(
            f"{BASE_URL}/api/salon/bookings",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        bookings = bookings_res.json()["bookings"]
        
        # Find a booking with staff
        booking_with_staff = next(
            (b for b in bookings if b.get("staffId")),
            None
        )
        
        if not booking_with_staff:
            pytest.skip("No booking with staff assignment")
        
        # Get detail
        response = requests.get(
            f"{BASE_URL}/api/salon/bookings/{booking_with_staff['id']}",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("staffId") == booking_with_staff["staffId"]
        print(f"✓ Booking detail includes staffId: {data.get('staffId')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
