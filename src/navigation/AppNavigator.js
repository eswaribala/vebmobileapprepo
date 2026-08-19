import React from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer, StackActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { useAuth, isFullAccess } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
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
import ImportDataScreen from '../screens/import/ImportDataScreen';
import DiagnosisScreen from '../screens/diagnosis/DiagnosisScreen';
import TreatmentPlanScreen from '../screens/diagnosis/TreatmentPlan';
import PrescriptionScreen from '../screens/diagnosis/Prescription';
import BillingScreen from '../screens/billing/BillingScreen';
import BillDetailScreen from '../screens/billing/BillDetail';
import ClinicIncomeScreen from '../screens/billing/ClinicIncomeScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Maps each tab name to the first screen inside its stack.
// When the tab button is pressed, we always reset to that screen so
// quick-action navigation never leaves a stale screen on the stack.
const TAB_INITIAL_SCREEN = {
  Patients:     'PatientList',
  Appointments: 'AppointmentList',
  Clinic:       'Clinic',
  Bills:        'BillingList',
  Consulting:   'MyConsulting',
};

function resetTabListener({ navigation, route }) {
  if (!TAB_INITIAL_SCREEN[route.name]) return {}; // Dashboard / Income — nothing to reset
  return {
    tabPress: (e) => {
      e.preventDefault(); // block default "restore last screen in stack" behaviour

      try {
        // Find the nested stack navigator's key inside this tab's saved state.
        // React Navigation keeps route states in memory even when unmountOnBlur
        // removes the component, so this works whether the tab is visible or not.
        const tabState  = navigation.getState();
        const tabRoute  = tabState?.routes?.find(r => r.name === route.name);
        const stackKey  = tabRoute?.state?.key;

        if (stackKey && (tabRoute.state.index ?? 0) > 0) {
          // Screens above the initial one exist — pop them all so the
          // stack navigator's in-memory state resets to the root screen.
          navigation.dispatch({ ...StackActions.popToTop(), target: stackKey });
        }
      } catch (_) {}

      // Switch to (or stay on) this tab. Because the stack state was already
      // reset above, the tab will open at its root screen.
      navigation.navigate(route.name);
    },
  };
}

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
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="ImportData" component={ImportDataScreen} options={{ title: 'Import from Excel' }} />
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

function IncomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ClinicIncome" component={ClinicIncomeScreen} options={{ title: 'Clinic Income' }} />
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

// Doctor — no Income tab
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
        unmountOnBlur: true,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{
          headerShown: true, ...screenOptions, title: 'VEB DENTAL CARE',
          headerRight: () => <LogoutButton />,
        }} />
      <Tab.Screen name="Patients"     component={PatientStack}     listeners={resetTabListener} />
      <Tab.Screen name="Appointments" component={AppointmentStack} listeners={resetTabListener} />
      <Tab.Screen name="Clinic"       component={ClinicStack}      listeners={resetTabListener} />
      <Tab.Screen name="Bills"        component={BillingStack}     listeners={resetTabListener} />
    </Tab.Navigator>
  );
}

// Manager — same as FullAccess + Income tab
function ManagerTabs() {
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
            Income: focused ? 'trending-up' : 'trending-up-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
        unmountOnBlur: true,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ headerShown: true, ...screenOptions, title: 'VEB DENTAL CARE', headerRight: () => <LogoutButton /> }} />
      <Tab.Screen name="Patients"     component={PatientStack}     listeners={resetTabListener} />
      <Tab.Screen name="Appointments" component={AppointmentStack} listeners={resetTabListener} />
      <Tab.Screen name="Clinic"       component={ClinicStack}      listeners={resetTabListener} />
      <Tab.Screen name="Bills"        component={BillingStack}     listeners={resetTabListener} />
      <Tab.Screen name="Income"       component={IncomeStack} />
    </Tab.Navigator>
  );
}

function LimitedAccessTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
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
        unmountOnBlur: true,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{
          headerShown: true, ...screenOptions, title: 'VEB DENTAL CARE',
          headerRight: () => <LogoutButton />,
        }} />
      <Tab.Screen name="Patients"     component={PatientStack}     listeners={resetTabListener} />
      <Tab.Screen name="Appointments" component={AppointmentStack} listeners={resetTabListener} />
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

// Owner tabs = Full tabs + Income + My Consulting
function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard:  focused ? 'home'        : 'home-outline',
            Patients:   focused ? 'people'      : 'people-outline',
            Appointments: focused ? 'calendar'  : 'calendar-outline',
            Clinic:     focused ? 'medical'     : 'medical-outline',
            Bills:      focused ? 'receipt'     : 'receipt-outline',
            Income:     focused ? 'trending-up' : 'trending-up-outline',
            Consulting: focused ? 'briefcase'   : 'briefcase-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerShown: false,
        unmountOnBlur: true,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ headerShown: true, ...screenOptions, title: 'VEB DENTAL CARE', headerRight: () => <LogoutButton /> }} />
      <Tab.Screen name="Patients"     component={PatientStack}      listeners={resetTabListener} />
      <Tab.Screen name="Appointments" component={AppointmentStack}  listeners={resetTabListener} />
      <Tab.Screen name="Clinic"       component={ClinicStack}       listeners={resetTabListener} />
      <Tab.Screen name="Bills"        component={BillingStack}      listeners={resetTabListener} />
      <Tab.Screen name="Income"       component={IncomeStack} />
      <Tab.Screen name="Consulting"   component={MyConsultingStack} listeners={resetTabListener} />
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
          : user.role === 'manager'
            ? <ManagerTabs />
            : isFullAccess(user.role)
              ? <FullAccessTabs />
              : <LimitedAccessTabs />}
    </NavigationContainer>
  );
}
