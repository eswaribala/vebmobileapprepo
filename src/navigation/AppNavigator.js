import React from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { useAuth, isFullAccess } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import SignupRequestsScreen from '../screens/owner/SignupRequestsScreen';
import MyConsultingScreen from '../screens/owner/MyConsultingScreen';
import MyAppointmentFormScreen from '../screens/owner/MyAppointmentForm';
import MyEarningsReport from '../screens/owner/MyEarningsReport';

// Main screens
import DashboardScreen from '../screens/Dashboard';
import PatientListScreen from '../screens/patients/PatientList';
import PatientRegistrationScreen from '../screens/patients/PatientRegistration';
import PatientDetailsScreen from '../screens/patients/PatientDetails';
import PatientIDCardScreen from '../screens/patients/PatientIDCard';
import AppointmentListScreen from '../screens/appointments/AppointmentList';
import BookAppointmentScreen from '../screens/appointments/BookAppointment';
import ClinicScreen from '../screens/ClinicScreen';
import DoctorListScreen from '../screens/doctors/DoctorList';
import DoctorFormScreen from '../screens/doctors/DoctorForm';
import StaffListScreen from '../screens/staff/StaffList';
import StaffFormScreen from '../screens/staff/StaffForm';
import ConsultantListScreen from '../screens/consultants/ConsultantList';
import ConsultantFormScreen from '../screens/consultants/ConsultantForm';
import ConsultantDetailScreen from '../screens/consultants/ConsultantDetail';
import ConsultantPaymentFormScreen from '../screens/consultants/ConsultantPaymentForm';
import ManagerListScreen from '../screens/managers/ManagerList';
import ManagerFormScreen from '../screens/managers/ManagerForm';
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import DiagnosisScreen from '../screens/diagnosis/DiagnosisScreen';
import TreatmentPlanScreen from '../screens/diagnosis/TreatmentPlan';
import PrescriptionScreen from '../screens/diagnosis/Prescription';
import BillingScreen from '../screens/billing/BillingScreen';
import BillDetailScreen from '../screens/billing/BillDetail';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: theme.colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
};

// ── Shared stacks ─────────────────────────────────────────────────────────────

function PatientStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="PatientList" component={PatientListScreen} options={{ title: 'Patients' }} />
      <Stack.Screen name="PatientRegistration" component={PatientRegistrationScreen} options={{ title: 'New Patient' }} />
      <Stack.Screen name="PatientDetails" component={PatientDetailsScreen} options={{ title: 'Patient Details' }} />
      <Stack.Screen name="PatientIDCard" component={PatientIDCardScreen} options={{ title: 'Patient ID Card' }} />
      <Stack.Screen name="Diagnosis" component={DiagnosisScreen} options={{ title: 'Dental Diagnosis' }} />
      <Stack.Screen name="TreatmentPlan" component={TreatmentPlanScreen} options={{ title: 'Treatment Plan' }} />
      <Stack.Screen name="Prescription" component={PrescriptionScreen} options={{ title: 'Prescription' }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ title: 'Create Bill' }} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} options={{ title: 'Bill Details' }} />
    </Stack.Navigator>
  );
}

function AppointmentStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AppointmentList" component={AppointmentListScreen} options={{ title: 'Appointments' }} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ title: 'Book Appointment' }} />
    </Stack.Navigator>
  );
}

// Attendance-only stack (for limited-access users)
function AttendanceStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
    </Stack.Navigator>
  );
}

// ── Full-access Clinic stack ───────────────────────────────────────────────────

function ClinicStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Clinic" component={ClinicScreen} options={{ title: 'Clinic Management' }} />
      <Stack.Screen name="DoctorList" component={DoctorListScreen} options={{ title: 'Doctors' }} />
      <Stack.Screen name="DoctorForm" component={DoctorFormScreen} options={{ title: 'Doctor Details' }} />
      <Stack.Screen name="StaffList" component={StaffListScreen} options={{ title: 'Staff' }} />
      <Stack.Screen name="StaffForm" component={StaffFormScreen} options={{ title: 'Staff Details' }} />
      <Stack.Screen name="ConsultantList" component={ConsultantListScreen} options={{ title: 'Consultants' }} />
      <Stack.Screen name="ConsultantForm" component={ConsultantFormScreen} options={{ title: 'Consultant Details' }} />
      <Stack.Screen name="ConsultantDetail" component={ConsultantDetailScreen} options={{ title: 'Consultant' }} />
      <Stack.Screen name="ConsultantPaymentForm" component={ConsultantPaymentFormScreen} options={{ title: 'Record Payment' }} />
      <Stack.Screen name="ManagerList" component={ManagerListScreen} options={{ title: 'Managers' }} />
      <Stack.Screen name="ManagerForm" component={ManagerFormScreen} options={{ title: 'Manager Details' }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      <Stack.Screen name="SignupRequests" component={SignupRequestsScreen} options={{ title: 'Signup Requests' }} />
    </Stack.Navigator>
  );
}

function BillingStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BillingList" component={BillingScreen} options={{ title: 'Billing' }} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} options={{ title: 'Bill Details' }} />
    </Stack.Navigator>
  );
}

// ── Logout header button ───────────────────────────────────────────────────────

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 14 }}>
      <Ionicons name="log-out-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

// ── Tab navigators ─────────────────────────────────────────────────────────────

const tabBarStyle = {
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: theme.colors.border,
  paddingBottom: 5,
  height: 60,
};

function FullAccessTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Patients: focused ? 'people' : 'people-outline',
            Appointments: focused ? 'calendar' : 'calendar-outline',
            Clinic: focused ? 'medical' : 'medical-outline',
            Bills: focused ? 'receipt' : 'receipt-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{
          headerShown: true, ...screenOptions, title: 'VEB DENTAL CARE',
          headerRight: () => <LogoutButton />,
        }} />
      <Tab.Screen name="Patients" component={PatientStack} />
      <Tab.Screen name="Appointments" component={AppointmentStack} />
      <Tab.Screen name="Clinic" component={ClinicStack} />
      <Tab.Screen name="Bills" component={BillingStack} />
    </Tab.Navigator>
  );
}

function LimitedAccessTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Patients: focused ? 'people' : 'people-outline',
            Appointments: focused ? 'calendar' : 'calendar-outline',
            Attendance: focused ? 'time' : 'time-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}>
      <Tab.Screen name="Patients" component={PatientStack}
        options={{
          // Inject logout into patient list header via screenOptions override
        }} />
      <Tab.Screen name="Appointments" component={AppointmentStack} />
      <Tab.Screen name="Attendance" component={AttendanceStack}
        options={{
          headerShown: true, ...screenOptions, title: 'Attendance',
          headerRight: () => <LogoutButton />,
        }} />
    </Tab.Navigator>
  );
}

// ── Owner-only: My Consulting stack ───────────────────────────────────────────

function MyConsultingStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MyConsulting" component={MyConsultingScreen} options={{ title: 'My Consulting' }} />
      <Stack.Screen name="MyAppointmentForm" component={MyAppointmentFormScreen} options={{ title: 'Appointment' }} />
      <Stack.Screen name="MyEarnings" component={MyEarningsReport} options={{ title: 'My Earnings' }} />
    </Stack.Navigator>
  );
}

// Owner tabs = Full tabs + My Consulting
function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Patients: focused ? 'people' : 'people-outline',
            Appointments: focused ? 'calendar' : 'calendar-outline',
            Clinic: focused ? 'medical' : 'medical-outline',
            Bills: focused ? 'receipt' : 'receipt-outline',
            Consulting: focused ? 'briefcase' : 'briefcase-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ headerShown: true, ...screenOptions, title: 'VEB DENTAL CARE', headerRight: () => <LogoutButton /> }} />
      <Tab.Screen name="Patients" component={PatientStack} />
      <Tab.Screen name="Appointments" component={AppointmentStack} />
      <Tab.Screen name="Clinic" component={ClinicStack} />
      <Tab.Screen name="Bills" component={BillingStack} />
      <Tab.Screen name="Consulting" component={MyConsultingStack} />
    </Tab.Navigator>
  );
}

// ── Auth stack ─────────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </Stack.Navigator>
  );
}

// ── Root navigator ─────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user
        ? <AuthStack />
        : user.role === 'owner'
          ? <OwnerTabs />
          : isFullAccess(user.role)
            ? <FullAccessTabs />
            : <LimitedAccessTabs />}
    </NavigationContainer>
  );
}
