import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

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

function ClinicStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Clinic" component={ClinicScreen} options={{ title: 'Clinic Management' }} />
      <Stack.Screen name="DoctorList" component={DoctorListScreen} options={{ title: 'Doctors' }} />
      <Stack.Screen name="DoctorForm" component={DoctorFormScreen} options={{ title: 'Doctor Details' }} />
      <Stack.Screen name="StaffList" component={StaffListScreen} options={{ title: 'Staff' }} />
      <Stack.Screen name="StaffForm" component={StaffFormScreen} options={{ title: 'Staff Details' }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
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

export default function AppNavigator() {
  return (
    <NavigationContainer>
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
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingBottom: 5,
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen}
          options={{ headerShown: true, ...screenOptions, title: 'VEB Dental Care' }} />
        <Tab.Screen name="Patients" component={PatientStack} />
        <Tab.Screen name="Appointments" component={AppointmentStack} />
        <Tab.Screen name="Clinic" component={ClinicStack} />
        <Tab.Screen name="Bills" component={BillingStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
