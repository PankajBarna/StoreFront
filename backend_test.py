import requests
import sys
from datetime import datetime
import json

class SalonAPITester:
    def __init__(self, base_url="https://glow-appointments-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_seed_database(self):
        """Seed database with sample data"""
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200
        )
        return success

    def test_public_endpoints(self):
        """Test all public API endpoints"""
        print("\n=== Testing Public Endpoints ===")
        
        # Root endpoint
        self.run_test("API Root", "GET", "", 200)
        
        # Salon profile
        success, salon_data = self.run_test("Get Salon Profile", "GET", "salon", 200)
        
        # Categories
        self.run_test("Get Categories", "GET", "categories", 200)
        
        # Services
        self.run_test("Get Services", "GET", "services", 200)
        
        # Grouped services
        self.run_test("Get Grouped Services", "GET", "services/grouped", 200)
        
        # Gallery
        self.run_test("Get Gallery", "GET", "gallery", 200)
        
        # Gallery tags
        self.run_test("Get Gallery Tags", "GET", "gallery/tags", 200)
        
        # Reviews
        self.run_test("Get Reviews", "GET", "reviews", 200)
        
        # Offers
        self.run_test("Get Offers", "GET", "offers", 200)
        
        # Home data
        self.run_test("Get Home Data", "GET", "home-data", 200)
        
        return salon_data if success else None

    def test_admin_login(self):
        """Test admin authentication"""
        print("\n=== Testing Admin Authentication ===")
        
        # Test login with correct credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@glowbeauty.com", "password": "admin123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Token obtained: {self.token[:20]}...")
            
            # Test get current admin info
            self.run_test("Get Admin Info", "GET", "auth/me", 200)
            return True
        else:
            print("❌ Failed to get admin token")
            return False

    def test_admin_salon_crud(self):
        """Test salon profile CRUD operations"""
        print("\n=== Testing Salon CRUD ===")
        
        if not self.token:
            print("❌ No admin token available")
            return False
        
        # Update salon profile
        update_data = {
            "name": "Glow Beauty Studio Updated",
            "phone": "+91 98765 43210"
        }
        
        self.run_test(
            "Update Salon Profile",
            "PUT",
            "admin/salon",
            200,
            data=update_data
        )

    def test_admin_services_crud(self):
        """Test services CRUD operations"""
        print("\n=== Testing Services CRUD ===")
        
        if not self.token:
            print("❌ No admin token available")
            return False
        
        # Get categories first
        success, categories = self.run_test("Get Categories for Service", "GET", "categories", 200)
        if not success or not categories:
            print("❌ No categories available for service creation")
            return False
        
        category_id = categories[0]['id'] if categories else "cat-hair"
        
        # Create a new service
        service_data = {
            "categoryId": category_id,
            "name": "Test Service",
            "priceStartingAt": 500,
            "durationMins": 30,
            "description": "Test service description",
            "active": True
        }
        
        success, new_service = self.run_test(
            "Create Service",
            "POST",
            "admin/services",
            201,
            data=service_data
        )
        
        if success and new_service:
            service_id = new_service.get('id')
            
            # Update the service
            update_data = {
                "name": "Updated Test Service",
                "priceStartingAt": 600
            }
            
            self.run_test(
                "Update Service",
                "PUT",
                f"admin/services/{service_id}",
                200,
                data=update_data
            )
            
            # Toggle service status
            self.run_test(
                "Toggle Service Status",
                "PATCH",
                f"admin/services/{service_id}/toggle",
                200
            )
            
            # Delete the service
            self.run_test(
                "Delete Service",
                "DELETE",
                f"admin/services/{service_id}",
                200
            )

    def test_admin_gallery_crud(self):
        """Test gallery CRUD operations"""
        print("\n=== Testing Gallery CRUD ===")
        
        if not self.token:
            print("❌ No admin token available")
            return False
        
        # Create a new gallery image
        image_data = {
            "imageUrl": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
            "caption": "Test Image",
            "tag": "hair",
            "order": 1
        }
        
        success, new_image = self.run_test(
            "Create Gallery Image",
            "POST",
            "admin/gallery",
            201,
            data=image_data
        )
        
        if success and new_image:
            image_id = new_image.get('id')
            
            # Update the image
            update_data = {
                "caption": "Updated Test Image",
                "tag": "facial"
            }
            
            self.run_test(
                "Update Gallery Image",
                "PUT",
                f"admin/gallery/{image_id}",
                200,
                data=update_data
            )
            
            # Delete the image
            self.run_test(
                "Delete Gallery Image",
                "DELETE",
                f"admin/gallery/{image_id}",
                200
            )

    def test_admin_reviews_crud(self):
        """Test reviews CRUD operations"""
        print("\n=== Testing Reviews CRUD ===")
        
        if not self.token:
            print("❌ No admin token available")
            return False
        
        # Create a new review
        review_data = {
            "name": "Test Customer",
            "rating": 5,
            "text": "Great service! Highly recommended.",
            "source": "Google",
            "order": 1
        }
        
        success, new_review = self.run_test(
            "Create Review",
            "POST",
            "admin/reviews",
            201,
            data=review_data
        )
        
        if success and new_review:
            review_id = new_review.get('id')
            
            # Update the review
            update_data = {
                "name": "Updated Test Customer",
                "rating": 4
            }
            
            self.run_test(
                "Update Review",
                "PUT",
                f"admin/reviews/{review_id}",
                200,
                data=update_data
            )
            
            # Delete the review
            self.run_test(
                "Delete Review",
                "DELETE",
                f"admin/reviews/{review_id}",
                200
            )

    def test_admin_offers_crud(self):
        """Test offers CRUD operations"""
        print("\n=== Testing Offers CRUD ===")
        
        if not self.token:
            print("❌ No admin token available")
            return False
        
        # Create a new offer
        offer_data = {
            "title": "Test Offer",
            "description": "Special discount for testing",
            "validTill": "2026-12-31",
            "active": True
        }
        
        success, new_offer = self.run_test(
            "Create Offer",
            "POST",
            "admin/offers",
            201,
            data=offer_data
        )
        
        if success and new_offer:
            offer_id = new_offer.get('id')
            
            # Update the offer
            update_data = {
                "title": "Updated Test Offer",
                "description": "Updated special discount"
            }
            
            self.run_test(
                "Update Offer",
                "PUT",
                f"admin/offers/{offer_id}",
                200,
                data=update_data
            )
            
            # Toggle offer status
            self.run_test(
                "Toggle Offer Status",
                "PATCH",
                f"admin/offers/{offer_id}/toggle",
                200
            )
            
            # Delete the offer
            self.run_test(
                "Delete Offer",
                "DELETE",
                f"admin/offers/{offer_id}",
                200
            )

def main():
    print("🧪 Starting Glow Beauty Studio API Tests")
    print("=" * 50)
    
    tester = SalonAPITester()
    
    # Seed database first
    print("\n=== Seeding Database ===")
    tester.test_seed_database()
    
    # Test public endpoints
    salon_data = tester.test_public_endpoints()
    
    # Test admin authentication
    login_success = tester.test_admin_login()
    
    if login_success:
        # Test admin CRUD operations
        tester.test_admin_salon_crud()
        tester.test_admin_services_crud()
        tester.test_admin_gallery_crud()
        tester.test_admin_reviews_crud()
        tester.test_admin_offers_crud()
    else:
        print("❌ Skipping admin tests due to login failure")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for i, test in enumerate(tester.failed_tests, 1):
            print(f"{i}. {test.get('test', 'Unknown')}")
            if 'error' in test:
                print(f"   Error: {test['error']}")
            else:
                print(f"   Expected: {test.get('expected')}, Got: {test.get('actual')}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n✨ Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())