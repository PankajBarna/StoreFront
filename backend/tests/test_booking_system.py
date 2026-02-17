"""
Backend API Tests for Salon Booking System
Tests: Authentication, Feature Flags, Booking CRUD, Availability
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PLATFORM_ADMIN = {"email": "platform@admin.com", "password": "platform123"}
SALON_ADMIN = {"email": "admin@glowbeauty.com", "password": "admin123"}


class TestHealthAndBasicEndpoints:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")
    
    def test_get_salon_profile(self):
        """Test salon profile endpoint"""
        response = requests.get(f"{BASE_URL}/api/salon")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "whatsappNumber" in data
        print(f"✓ Salon profile: {data['name']}")
    
    def test_get_services(self):
        """Test services endpoint"""
        response = requests.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Services count: {len(data)}")
    
    def test_get_public_features(self):
        """Test public features endpoint"""
        response = requests.get(f"{BASE_URL}/api/features")
        assert response.status_code == 200
        data = response.json()
        assert "booking_calendar_enabled" in data
        print(f"✓ Features: booking_calendar_enabled={data['booking_calendar_enabled']}")


class TestAuthentication:
    """Authentication tests for salon and platform admin"""
    
    def test_salon_admin_login_success(self):
        """Test salon admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALON_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "salon_owner"
        print(f"✓ Salon admin login successful, role: {data['role']}")
        return data["access_token"]
    
    def test_platform_admin_login_success(self):
        """Test platform admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "platform_admin"
        print(f"✓ Platform admin login successful, role: {data['role']}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")
    
    def test_auth_me_with_valid_token(self):
        """Test /auth/me with valid token"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=SALON_ADMIN)
        token = login_res.json()["access_token"]
        
        # Then check /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SALON_ADMIN["email"]
        print(f"✓ Auth me: {data['email']}, role: {data['role']}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access rejected correctly")


class TestPlatformFeatureFlags:
    """Tests for platform admin feature flag management"""
    
    @pytest.fixture
    def platform_token(self):
        """Get platform admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_ADMIN)
        return response.json()["access_token"]
    
    @pytest.fixture
    def salon_token(self):
        """Get salon admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALON_ADMIN)
        return response.json()["access_token"]
    
    def test_get_features_as_platform_admin(self, platform_token):
        """Test getting feature flags as platform admin"""
        response = requests.get(f"{BASE_URL}/api/admin/features", headers={
            "Authorization": f"Bearer {platform_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "booking_calendar_enabled" in data
        print(f"✓ Platform admin can view features: {data}")
    
    def test_get_features_as_salon_admin_forbidden(self, salon_token):
        """Test that salon admin cannot access platform features"""
        response = requests.get(f"{BASE_URL}/api/admin/features", headers={
            "Authorization": f"Bearer {salon_token}"
        })
        assert response.status_code == 403
        print("✓ Salon admin correctly denied access to platform features")
    
    def test_toggle_booking_calendar_enabled(self, platform_token):
        """Test toggling booking_calendar_enabled feature"""
        # Get current state
        get_res = requests.get(f"{BASE_URL}/api/admin/features", headers={
            "Authorization": f"Bearer {platform_token}"
        })
        current_state = get_res.json()["booking_calendar_enabled"]
        
        # Toggle to opposite
        new_state = not current_state
        patch_res = requests.patch(f"{BASE_URL}/api/admin/features", 
            headers={"Authorization": f"Bearer {platform_token}"},
            json={"booking_calendar_enabled": new_state}
        )
        assert patch_res.status_code == 200
        data = patch_res.json()
        assert data["booking_calendar_enabled"] == new_state
        print(f"✓ Feature toggled from {current_state} to {new_state}")
        
        # Toggle back to original
        requests.patch(f"{BASE_URL}/api/admin/features", 
            headers={"Authorization": f"Bearer {platform_token}"},
            json={"booking_calendar_enabled": current_state}
        )
        print(f"✓ Feature restored to {current_state}")


class TestPublicBookingAPIs:
    """Tests for public booking APIs (availability and booking creation)"""
    
    @pytest.fixture
    def platform_token(self):
        """Get platform admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_ADMIN)
        return response.json()["access_token"]
    
    def ensure_booking_enabled(self, platform_token):
        """Ensure booking calendar is enabled for testing"""
        requests.patch(f"{BASE_URL}/api/admin/features", 
            headers={"Authorization": f"Bearer {platform_token}"},
            json={"booking_calendar_enabled": True}
        )
    
    def ensure_booking_disabled(self, platform_token):
        """Ensure booking calendar is disabled for testing"""
        requests.patch(f"{BASE_URL}/api/admin/features", 
            headers={"Authorization": f"Bearer {platform_token}"},
            json={"booking_calendar_enabled": False}
        )
    
    def test_get_availability_when_enabled(self, platform_token):
        """Test getting availability when booking is enabled"""
        self.ensure_booking_enabled(platform_token)
        
        # Get a service ID
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service_id = services[0]["id"]
        
        # Get availability for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/public/availability?serviceId={service_id}&date={tomorrow}")
        
        assert response.status_code == 200
        data = response.json()
        assert "slots" in data
        assert "date" in data
        assert data["date"] == tomorrow
        print(f"✓ Availability for {tomorrow}: {len(data['slots'])} slots")
    
    def test_get_availability_when_disabled(self, platform_token):
        """Test that availability returns 403 when booking is disabled"""
        self.ensure_booking_disabled(platform_token)
        
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service_id = services[0]["id"]
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/public/availability?serviceId={service_id}&date={tomorrow}")
        
        assert response.status_code == 403
        print("✓ Availability correctly returns 403 when booking disabled")
        
        # Re-enable for other tests
        self.ensure_booking_enabled(platform_token)
    
    def test_create_booking_when_enabled(self, platform_token):
        """Test creating a booking when booking is enabled"""
        self.ensure_booking_enabled(platform_token)
        
        # Get a service
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service = services[0]
        
        # Get availability
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        avail_res = requests.get(f"{BASE_URL}/api/public/availability?serviceId={service['id']}&date={tomorrow}")
        slots = avail_res.json()["slots"]
        
        if len(slots) == 0:
            pytest.skip("No available slots for testing")
        
        slot = slots[0]
        
        # Create booking
        booking_data = {
            "serviceId": service["id"],
            "clientName": "TEST_Client",
            "clientPhone": "9876543210",
            "startTime": slot["startTime"],
            "notes": "Test booking"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/bookings", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert "booking" in data
        assert data["booking"]["clientName"] == "TEST_Client"
        assert data["booking"]["status"] == "pending"
        assert "whatsappUrl" in data
        print(f"✓ Booking created: {data['booking']['id']}")
        return data["booking"]["id"]
    
    def test_create_booking_when_disabled(self, platform_token):
        """Test that booking creation returns 403 when disabled"""
        self.ensure_booking_disabled(platform_token)
        
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service = services[0]
        
        booking_data = {
            "serviceId": service["id"],
            "clientName": "TEST_Client",
            "clientPhone": "9876543210",
            "startTime": (datetime.now() + timedelta(days=1, hours=10)).isoformat(),
            "notes": "Test booking"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/bookings", json=booking_data)
        assert response.status_code == 403
        print("✓ Booking creation correctly returns 403 when disabled")
        
        # Re-enable for other tests
        self.ensure_booking_enabled(platform_token)


class TestSalonBookingManagement:
    """Tests for salon admin booking management APIs"""
    
    @pytest.fixture
    def platform_token(self):
        """Get platform admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_ADMIN)
        return response.json()["access_token"]
    
    @pytest.fixture
    def salon_token(self):
        """Get salon admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALON_ADMIN)
        return response.json()["access_token"]
    
    def ensure_booking_enabled(self, platform_token):
        """Ensure booking calendar is enabled"""
        requests.patch(f"{BASE_URL}/api/admin/features", 
            headers={"Authorization": f"Bearer {platform_token}"},
            json={"booking_calendar_enabled": True}
        )
    
    def test_get_salon_bookings(self, platform_token, salon_token):
        """Test getting bookings for salon dashboard"""
        self.ensure_booking_enabled(platform_token)
        
        response = requests.get(f"{BASE_URL}/api/salon/bookings", headers={
            "Authorization": f"Bearer {salon_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data
        assert "total" in data
        print(f"✓ Salon bookings: {data['total']} total")
    
    def test_get_salon_bookings_with_date_filter(self, platform_token, salon_token):
        """Test getting bookings with date filter"""
        self.ensure_booking_enabled(platform_token)
        
        from_date = datetime.now().strftime("%Y-%m-%dT00:00:00")
        to_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT23:59:59")
        
        response = requests.get(
            f"{BASE_URL}/api/salon/bookings?from_date={from_date}&to_date={to_date}",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data
        print(f"✓ Filtered bookings: {data['total']} in date range")
    
    def test_update_booking_status(self, platform_token, salon_token):
        """Test updating booking status (confirm, cancel)"""
        self.ensure_booking_enabled(platform_token)
        
        # First create a booking
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service = services[0]
        
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        avail_res = requests.get(f"{BASE_URL}/api/public/availability?serviceId={service['id']}&date={tomorrow}")
        slots = avail_res.json()["slots"]
        
        if len(slots) == 0:
            pytest.skip("No available slots for testing")
        
        slot = slots[0]
        
        booking_data = {
            "serviceId": service["id"],
            "clientName": "TEST_StatusUpdate",
            "clientPhone": "9876543211",
            "startTime": slot["startTime"],
            "notes": "Test status update"
        }
        
        create_res = requests.post(f"{BASE_URL}/api/public/bookings", json=booking_data)
        booking_id = create_res.json()["booking"]["id"]
        
        # Update status to confirmed
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/status",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={"status": "confirmed"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"
        print(f"✓ Booking {booking_id} status updated to confirmed")
        
        # Update status to cancelled
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/status",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={"status": "cancelled"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"
        print(f"✓ Booking {booking_id} status updated to cancelled")
    
    def test_reschedule_booking(self, platform_token, salon_token):
        """Test rescheduling a booking"""
        self.ensure_booking_enabled(platform_token)
        
        # Create a booking
        services_res = requests.get(f"{BASE_URL}/api/services")
        services = services_res.json()
        service = services[0]
        
        day_after = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        avail_res = requests.get(f"{BASE_URL}/api/public/availability?serviceId={service['id']}&date={day_after}")
        slots = avail_res.json()["slots"]
        
        if len(slots) < 2:
            pytest.skip("Not enough slots for reschedule testing")
        
        # Create booking with first slot
        booking_data = {
            "serviceId": service["id"],
            "clientName": "TEST_Reschedule",
            "clientPhone": "9876543212",
            "startTime": slots[0]["startTime"],
            "notes": "Test reschedule"
        }
        
        create_res = requests.post(f"{BASE_URL}/api/public/bookings", json=booking_data)
        booking_id = create_res.json()["booking"]["id"]
        original_time = slots[0]["startTime"]
        
        # Reschedule to second slot
        new_time = slots[1]["startTime"]
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/reschedule",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={
                "newStartTime": new_time,
                "reason": "Customer requested change"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["startTime"] == new_time
        assert data["status"] == "confirmed"
        print(f"✓ Booking rescheduled from {original_time} to {new_time}")
    
    def test_get_booking_detail(self, platform_token, salon_token):
        """Test getting single booking details"""
        self.ensure_booking_enabled(platform_token)
        
        # Get existing bookings
        bookings_res = requests.get(f"{BASE_URL}/api/salon/bookings", headers={
            "Authorization": f"Bearer {salon_token}"
        })
        bookings = bookings_res.json()["bookings"]
        
        if len(bookings) == 0:
            pytest.skip("No bookings to test detail view")
        
        booking_id = bookings[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/salon/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == booking_id
        assert "clientName" in data
        assert "serviceName" in data or "serviceId" in data
        print(f"✓ Booking detail: {data['clientName']} - {data.get('serviceName', data['serviceId'])}")
    
    def test_get_booking_changes(self, platform_token, salon_token):
        """Test getting booking audit history"""
        self.ensure_booking_enabled(platform_token)
        
        # Get existing bookings
        bookings_res = requests.get(f"{BASE_URL}/api/salon/bookings", headers={
            "Authorization": f"Bearer {salon_token}"
        })
        bookings = bookings_res.json()["bookings"]
        
        if len(bookings) == 0:
            pytest.skip("No bookings to test changes")
        
        booking_id = bookings[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/changes",
            headers={"Authorization": f"Bearer {salon_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "changes" in data
        print(f"✓ Booking changes: {len(data['changes'])} change records")
    
    def test_invalid_status_update(self, platform_token, salon_token):
        """Test that invalid status is rejected"""
        self.ensure_booking_enabled(platform_token)
        
        # Get existing bookings
        bookings_res = requests.get(f"{BASE_URL}/api/salon/bookings", headers={
            "Authorization": f"Bearer {salon_token}"
        })
        bookings = bookings_res.json()["bookings"]
        
        if len(bookings) == 0:
            pytest.skip("No bookings to test invalid status")
        
        booking_id = bookings[0]["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/salon/bookings/{booking_id}/status",
            headers={"Authorization": f"Bearer {salon_token}"},
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400
        print("✓ Invalid status correctly rejected")


class TestBookingWhenDisabled:
    """Tests to verify booking APIs return 403 when feature is disabled"""
    
    @pytest.fixture
    def platform_token(self):
        """Get platform admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_ADMIN)
        return response.json()["access_token"]
    
    @pytest.fixture
    def salon_token(self):
        """Get salon admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALON_ADMIN)
        return response.json()["access_token"]
    
    def test_salon_bookings_when_disabled(self, platform_token, salon_token):
        """Test that salon bookings API returns 403 when disabled"""
        # Disable booking
        requests.patch(f"{BASE_URL}/api/admin/features", 
            headers={"Authorization": f"Bearer {platform_token}"},
            json={"booking_calendar_enabled": False}
        )
        
        response = requests.get(f"{BASE_URL}/api/salon/bookings", headers={
            "Authorization": f"Bearer {salon_token}"
        })
        assert response.status_code == 403
        print("✓ Salon bookings correctly returns 403 when disabled")
        
        # Re-enable
        requests.patch(f"{BASE_URL}/api/admin/features", 
            headers={"Authorization": f"Bearer {platform_token}"},
            json={"booking_calendar_enabled": True}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
